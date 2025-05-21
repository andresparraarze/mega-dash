const test = require('node:test');
const assert = require('node:assert');
const fetch = global.fetch;
let server;

async function startServer() {
  server = require('../server');
  await new Promise(res => server.listen(0, res));
  return server.address().port;
}

async function stopServer() {
  await new Promise(res => server.close(res));
  delete require.cache[require.resolve('../server')];
}

test('serves index.html', async (t) => {
  const port = await startServer();
  const res = await fetch(`http://localhost:${port}/`);
  assert.strictEqual(res.status, 200);
  const text = await res.text();
  assert.ok(text.includes('Weather Dashboard'));
  await stopServer();
});

test('weather endpoint requires parameters', async () => {
  const port = await startServer();
  const res = await fetch(`http://localhost:${port}/weather`);
  assert.strictEqual(res.status, 400);
  await stopServer();
});

test('weather endpoint without API key returns 500', async () => {
  const port = await startServer();
  const res = await fetch(`http://localhost:${port}/weather?city=Toronto`);
  assert.strictEqual(res.status, 500);
  await stopServer();
});

test('bg endpoint without Unsplash key returns 500', async () => {
  const port = await startServer();
  const res = await fetch(`http://localhost:${port}/api/bg?condition=clear`);
  assert.strictEqual(res.status, 500);
  await stopServer();
});

test('photo endpoint without Unsplash key returns 500', async () => {
  const port = await startServer();
  const res = await fetch(`http://localhost:${port}/photo?query=test`);
  assert.strictEqual(res.status, 500);
  await stopServer();
});
