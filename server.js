const http = require('http');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env if present
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envData = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of envData) {
    const match = line.match(/^([^#=]+)=?(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (key) {
        process.env[key] = value;
      }
    }
  }
}

const PORT = process.env.PORT || 3000;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};

// Simple in-memory LRU cache for Unsplash responses
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const CACHE_LIMIT = 50;
const cache = new Map(); // query -> {data, time}
let rateLimitRemaining = Infinity;
const RATE_LIMIT_THRESHOLD = 5;

function getFromCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.time > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  cache.delete(key);
  cache.set(key, entry); // refresh LRU position
  return entry.data;
}

function storeInCache(key, data) {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, { data, time: Date.now() });
  while (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
}

async function handlePhoto(req, res, urlObj) {
  const query = urlObj.searchParams.get('query');
  if (!query) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Query parameter is required' }));
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Unsplash access key not configured' }));
  }

  const apiUrl = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&client_id=${accessKey}`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      res.writeHead(response.status, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Error fetching image' }));
    }
    const data = await response.json();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ url: data.urls && data.urls.regular }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}

async function handleBg(req, res, urlObj) {
  const condition = urlObj.searchParams.get('condition');
  if (!condition) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'condition parameter is required' }));
  }

  const map = { clear: 'sunny weather', rain: 'rainy day' };
  const query = map[condition.toLowerCase()] || condition;

  const cached = getFromCache(query);
  if (cached) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(cached));
  }

  if (rateLimitRemaining <= RATE_LIMIT_THRESHOLD) {
    if (cached) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(cached));
    }
    res.writeHead(429, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Rate limit exceeded' }));
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Unsplash access key not configured' }));
  }

  const apiUrl =
    `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}` +
    `&orientation=landscape&content_filter=high&count=1`;

  try {
    const response = await fetch(apiUrl, {
      headers: { Authorization: `Client-ID ${accessKey}` },
    });
    rateLimitRemaining = parseInt(
      response.headers.get('x-ratelimit-remaining') || '50',
      10
    );
    if (!response.ok) {
      res.writeHead(response.status, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Error fetching image' }));
    }
    const json = await response.json();
    const photo = Array.isArray(json) ? json[0] : json;

    if (photo.links && photo.links.download_location) {
      await fetch(photo.links.download_location, {
        headers: { Authorization: `Client-ID ${accessKey}` },
      }).catch(() => {});
    }

    const result = {
      url: photo.urls.regular,
      attribution: `Photo by <a href="${photo.user.links.html}?utm_source=mega-dash&utm_medium=referral">${photo.user.name}</a> / <a href="https://unsplash.com/?utm_source=mega-dash&utm_medium=referral">Unsplash</a>`,
    };

    storeInCache(query, result);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}

function serveStatic(req, res) {
  let filePath = path.join(__dirname, req.url === '/' ? '/index.html' : req.url);
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    return res.end();
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    const ext = path.extname(filePath);
    const type = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
}

async function handleWeather(req, res, urlObj) {
  const city = urlObj.searchParams.get('city');
  const lat = urlObj.searchParams.get('lat');
  const lon = urlObj.searchParams.get('lon');
  if (!city && !(lat && lon)) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(
      JSON.stringify({ error: 'City or lat/lon parameters are required' })
    );
  }
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'API key not configured' }));
  }
  try {
    let apiUrl;
    if (lat && lon) {
      apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&units=metric&appid=${apiKey}`;
    } else {
      apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${apiKey}`;
    }
    const response = await fetch(apiUrl);
    if (!response.ok) {
      res.writeHead(response.status, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Error fetching weather' }));
    }
    const data = await response.json();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}

async function handleForecast(req, res, urlObj) {
  const city = urlObj.searchParams.get('city');
  const lat = urlObj.searchParams.get('lat');
  const lon = urlObj.searchParams.get('lon');
  if (!city && !(lat && lon)) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(
      JSON.stringify({ error: 'City or lat/lon parameters are required' })
    );
  }
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'API key not configured' }));
  }
  try {
    let apiUrl;
    if (lat && lon) {
      apiUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&units=metric&appid=${apiKey}`;
    } else {
      apiUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=metric&appid=${apiKey}`;
    }
    const response = await fetch(apiUrl);
    if (!response.ok) {
      res.writeHead(response.status, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Error fetching forecast' }));
    }
    const data = await response.json();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  if (urlObj.pathname === '/weather') {
    return handleWeather(req, res, urlObj);
  }
  if (urlObj.pathname === '/forecast') {
    return handleForecast(req, res, urlObj);
  }
  if (urlObj.pathname === '/api/bg') {
    return handleBg(req, res, urlObj);
  }
  if (urlObj.pathname === '/photo') {
    return handlePhoto(req, res, urlObj);
  }
  serveStatic(req, res);
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

module.exports = server;
