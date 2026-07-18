#!/usr/bin/env node
/**
 * serve.js
 * ----------------------------------------------------------------
 * Zero-dependency static file server for local frontend testing.
 *
 * Why this exists: opening kam-app.html by double-clicking it loads
 * it over file://, and Google/Facebook's login SDKs both refuse to
 * work on file:// pages — they require a real http(s) origin. This
 * serves the current folder over http://localhost:5500 instead, so
 * OAuth login behaves the same way it will in production.
 *
 * Usage:
 *   npm run serve
 *   (then open http://localhost:5500 — NOT the .html file itself)
 * ----------------------------------------------------------------
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5500;
const ROOT = __dirname;
const DEFAULT_FILE = 'kam-app.html'; // served at "/"

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = `/${DEFAULT_FILE}`;

  const filePath = path.join(ROOT, urlPath);

  // Basic safety: don't allow escaping the project directory
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found: ' + urlPath);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n  Kam frontend running at http://localhost:${PORT}`);
  console.log(`  Open that URL in your browser (not the .html file directly)`);
  console.log(`  so Google/Facebook login work correctly.\n`);
});
