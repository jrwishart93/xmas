async function readRawBody(req) {
  const method = String(req.method || 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD') return undefined;

  if (req.body !== undefined && !req.readable) {
    if (Buffer.isBuffer(req.body)) return req.body;
    if (typeof req.body === 'string') return Buffer.from(req.body);
    return Buffer.from(JSON.stringify(req.body));
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (!chunks.length) return undefined;
  return Buffer.concat(chunks);
}

async function toWebRequest(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const url = new URL(req.url || '/', `${proto}://${host}`);
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers || {})) {
    if (Array.isArray(value)) {
      value.forEach((entry) => headers.append(key, entry));
      continue;
    }
    if (typeof value === 'string') {
      headers.set(key, value);
    }
  }

  const body = await readRawBody(req);

  return new Request(url.toString(), {
    method: String(req.method || 'GET').toUpperCase(),
    headers,
    body: body ? new Uint8Array(body) : undefined,
  });
}

async function sendWebResponse(res, response) {
  res.statusCode = response.status;

  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  const body = Buffer.from(await response.arrayBuffer());
  res.end(body);
}

function createVercelRoute(handlers) {
  return async function handler(req, res) {
    const method = String(req.method || 'GET').toUpperCase();
    const routeHandler = handlers[method];

    if (!routeHandler) {
      res.statusCode = 405;
      res.setHeader('Allow', Object.keys(handlers).join(', '));
      res.end('Method Not Allowed');
      return;
    }

    try {
      const request = await toWebRequest(req);
      const response = await routeHandler(request);
      await sendWebResponse(res, response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal Server Error';
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: message }));
    }
  };
}

module.exports = { createVercelRoute };
