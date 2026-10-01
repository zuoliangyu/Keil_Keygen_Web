import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const port = Number(process.env.PORT || 4173);
const site = new URL('../site/', import.meta.url);
const files = new Set(['index.html', 'styles.css', 'app.mjs', 'core.mjs', 'session.mjs', 'generator.worker.mjs', 'favicon.svg']);
const types = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', mjs: 'text/javascript; charset=utf-8', svg: 'image/svg+xml' };
createServer(async (req, res) => {
  let path;
  try { path = new URL(req.url, 'http://localhost').pathname; }
  catch { res.writeHead(400).end('Bad request'); return; }
  // /keil-web/ 用于模拟 GitHub Pages 仓库子路径；只允许访问明确列出的资源。
  if (path === '/keil-web') { res.writeHead(302, { Location: '/keil-web/' }).end(); return; }
  if (path.startsWith('/keil-web/')) path = path.slice('/keil-web'.length);
  const file = path === '/' ? 'index.html' : path.slice(1);
  if (!files.has(file)) {
    res.writeHead(404).end('Not found');
    return;
  }
  try {
    const content = await readFile(new URL(file, site));
    res.writeHead(200, { 'Content-Type': types[file.split('.').pop()], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(content);
  } catch {
    res.writeHead(500).end('Cannot load page');
  }
}).listen(port, '127.0.0.1', () => console.log(`本地预览：http://127.0.0.1:${port}/`));
