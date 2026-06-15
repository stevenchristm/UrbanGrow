const http = require('http');

const PORT = 8085;
const TARGET_PORT = 8080;

const server = http.createServer((req, res) => {
  const options = {
    hostname: '127.0.0.1',
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: req.headers,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  req.pipe(proxyReq, { end: true });
  req.on('error', () => {});
  res.on('error', () => {});

  proxyReq.on('error', (err) => {
    if (!res.headersSent) {
      res.writeHead(500);
      res.end('Proxy Error');
    }
  });
});

server.on('upgrade', (req, socket, head) => {
  socket.on('error', () => {});

  const options = {
    hostname: '127.0.0.1',
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: req.headers,
  };

  const proxyReq = http.request(options);
  proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
    proxySocket.on('error', () => {});

    const headers = Object.keys(proxyRes.headers)
      .map((k) => `${k}: ${proxyRes.headers[k]}`)
      .join('\r\n');
      
    socket.write(
      `HTTP/${proxyRes.httpVersion} 101 Switching Protocols\r\n` +
      `${headers}\r\n\r\n`
    );
    
    if (proxyHead && proxyHead.length) socket.write(proxyHead);
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });
  
  proxyReq.on('error', () => socket.destroy());
  proxyReq.end();
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[PROXY] Listening on 0.0.0.0:${PORT} -> forwarding to 127.0.0.1:${TARGET_PORT}`);
});
