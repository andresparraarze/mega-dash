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

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  if (urlObj.pathname === '/weather') {
    return handleWeather(req, res, urlObj);
  }
  if (urlObj.pathname === '/photo') {
    return handlePhoto(req, res, urlObj);
  }
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
