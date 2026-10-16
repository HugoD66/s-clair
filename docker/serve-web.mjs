import { createServer, request } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
const root = resolve('/workspace/public');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};
createServer((incoming, response) => {
  if (incoming.url?.startsWith('/api/')) {
    const upstream = request(
      {
        hostname: 'api',
        port: 3000,
        path: incoming.url,
        method: incoming.method,
        headers: { ...incoming.headers, host: 'api:3000' },
        timeout: 10000,
      },
      (result) => {
        response.writeHead(result.statusCode ?? 502, result.headers);
        result.pipe(response);
      },
    );
    upstream.on('timeout', () => upstream.destroy());
    upstream.on('error', () => {
      if (!response.headersSent) response.writeHead(502);
      response.end();
    });
    incoming.pipe(upstream);
    return;
  }
  void (async () => {
    if (!['GET', 'HEAD'].includes(incoming.method ?? '')) {
      response.writeHead(405);
      response.end();
      return;
    }
    const path = decodeURIComponent(new URL(incoming.url ?? '/', 'http://localhost').pathname);
    let file = resolve(root, `.${path}`);
    if (file !== root && !file.startsWith(`${root}/`)) {
      response.writeHead(403);
      response.end();
      return;
    }
    try {
      if (!(await stat(file)).isFile()) file = resolve(root, 'index.html');
    } catch {
      if (extname(path)) {
        response.writeHead(404);
        response.end();
        return;
      }
      file = resolve(root, 'index.html');
    }
    const content = await readFile(file);
    response.writeHead(200, {
      'content-type': mime[extname(file)] ?? 'application/octet-stream',
      'x-content-type-options': 'nosniff',
      'cache-control': 'no-cache',
    });
    response.end(incoming.method === 'HEAD' ? undefined : content);
  })().catch(() => {
    if (!response.headersSent) response.writeHead(400);
    response.end();
  });
}).listen(4200, '0.0.0.0');
