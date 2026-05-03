# Scan counter

El contador usa:

- api/scan.js
- script.js
- Redis/Upstash conectado en Vercel

Variables necesarias en Vercel:

- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN

Tambien acepta:

- KV_REST_API_URL
- KV_REST_API_TOKEN

Cada pagina debe tener:

<strong id="scanCount" data-scan-key="cap:marca:modelo">LOADING</strong>

Ejemplo Chrome CT:

data-scan-key="cap:barbas-hats:chrome-ct"