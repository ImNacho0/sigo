import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Auth Middleware Plugin simulating the Go Backend functionality
function authMiddleware(): Plugin {
  return {
    name: 'auth-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // Simple body parser for JSON
        const getBody = () => new Promise<any>((resolve) => {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', () => {
            try { resolve(JSON.parse(body || '{}')); }
            catch (e) { resolve({}); }
          });
        });

        // Parse Cookies helper
        const getCookie = (name: string) => {
          const value = `; ${req.headers.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) return parts.pop()?.split(';').shift();
          return null;
        };

        if (req.url === '/auth/verify' && req.method === 'POST') {
          const body = await getBody();
          const key = body.key;

          try {
            const licensesPath = path.resolve(__dirname, '..', 'licenses.json');
            const licensesData = JSON.parse(fs.readFileSync(licensesPath, 'utf-8'));

            // Check if key exists (as root object keys or inside them)
            // licenses.json structure from UCO-Web: { "test-license": { "key": "...", ... } }
            // Wait, UCO-Web uses the object key itself as the license key. 
            // e.g., licenseManager.Licenses[key]
            const lic = licensesData[key];

            if (!lic) {
              res.statusCode = 401;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: "Licencia no encontrada" }));
              return;
            }

            const expiration = new Date(lic.expiration);
            if (new Date() > expiration) {
              res.statusCode = 403;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: "Licencia expirada" }));
              return;
            }

            if (lic.type === 'api') {
              res.statusCode = 403;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: "Esta licencia es solo para uso de API" }));
              return;
            }

            // Set Cookie
            res.setHeader('Set-Cookie', `UCO_SESSION=${key}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ status: "ok", name: lic.name }));
            return;
          } catch (e) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: "Error interno del servidor leyendo licencias." }));
            return;
          }
        }

        if (req.url === '/auth/status' && req.method === 'GET') {
          const sessionKey = getCookie('UCO_SESSION');
          if (!sessionKey) {
            res.statusCode = 401;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: "No session" }));
            return;
          }

          try {
            const licensesPath = path.resolve(__dirname, '..', 'licenses.json');
            const licensesData = JSON.parse(fs.readFileSync(licensesPath, 'utf-8'));
            const lic = licensesData[sessionKey];

            if (!lic || lic.type === 'api') {
              res.statusCode = 401;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: "Licencia no válida o restringida" }));
              return;
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(lic));
            return;
          } catch (e) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: "Error interno del servidor" }));
            return;
          }
        }

        if (req.url === '/auth/logout' && req.method === 'POST') {
          res.setHeader('Set-Cookie', `UCO_SESSION=; Path=/; HttpOnly; Max-Age=0`);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ status: "ok" }));
          return;
        }

        next();
      });
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), authMiddleware()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        // The Go backend handles requests gracefully, we just pass them through
      },
      '/auth': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/auth/, ''),
        bypass: (req, _res, _options) => {
          // Interceptor para /api - Verifica la cookie de sesión antes de enviar al backend
          const cookieHeader = req.headers.cookie || '';
          if (!cookieHeader.includes('UCO_SESSION=')) {
            // Return matching 401 response directly via the res object in bypass isn't easy in vite synchronously, 
            // but we can mutate req url to something that fails safely, or just strip the Bearer token forcing a backend 401
            req.headers['authorization'] = ''; // Ensure backend rejects if bypass doesn't stop it
          } else {
            // Si hay cookie, inyectamos el token maestro del backend
            req.headers['authorization'] = 'Bearer SVwp00yfJjx2FTuV5AmFVEMUknsfd6sdertgajksfgyr1GBoKQjCK';
          }
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    }
  }
})
