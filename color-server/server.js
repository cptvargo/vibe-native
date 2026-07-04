const http    = require('http');
const url     = require('url');
const Vibrant = require('node-vibrant');

const PORT  = process.env.PORT || 6969;
const cache = new Map(); // imageUrl → full palette object

async function extractPalette(imageUrl) {
  if (cache.has(imageUrl)) return cache.get(imageUrl);

  const p = await Vibrant.from(imageUrl).getPalette();

  const result = {
    vibrant:      p.Vibrant?.hex      ?? null,
    lightVibrant: p.LightVibrant?.hex ?? null,
    darkVibrant:  p.DarkVibrant?.hex  ?? null,
    muted:        p.Muted?.hex        ?? null,
    lightMuted:   p.LightMuted?.hex   ?? null,
    darkMuted:    p.DarkMuted?.hex    ?? null,
    // backwards-compat single field — used by old App.js colorCache
    color:
      p.Vibrant?.hex      ??
      p.LightVibrant?.hex ??
      p.DarkVibrant?.hex  ??
      p.Muted?.hex        ??
      null,
  };

  cache.set(imageUrl, result);
  return result;
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { pathname, query } = url.parse(req.url, true);

  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, cached: cache.size }));
  }

  if (pathname !== '/color' || !query.url) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'GET /color?url=<imageUrl>' }));
  }

  try {
    const palette = await extractPalette(decodeURIComponent(query.url));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(palette));
  } catch {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      vibrant: null, lightVibrant: null, darkVibrant: null,
      muted: null, lightMuted: null, darkMuted: null, color: null,
    }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`ViBE color server running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
});
