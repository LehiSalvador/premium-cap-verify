export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");

  try {
    if (request.method !== "GET" && request.method !== "POST") {
      return response.status(405).json({
        ok: false,
        error: "method_not_allowed"
      });
    }

    const rawKey = String(request.query.key || "").trim();

    if (!rawKey) {
      return response.status(400).json({
        ok: false,
        error: "missing_key"
      });
    }

    const safeKey = rawKey
      .toLowerCase()
      .replace(/[^a-z0-9:_/-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 120);

    const redisKey = `premium-cap-verify:scans:${safeKey}`;

    const redisUrl =
      process.env.UPSTASH_REDIS_REST_URL ||
      process.env.KV_REST_API_URL;

    const redisToken =
      process.env.UPSTASH_REDIS_REST_TOKEN ||
      process.env.KV_REST_API_TOKEN;

    if (!redisUrl || !redisToken) {
      return response.status(500).json({
        ok: false,
        error: "missing_redis_env",
        message: "Redis environment variables are missing in Vercel."
      });
    }

    const redisResponse = await fetch(`${redisUrl}/incr/${encodeURIComponent(redisKey)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`
      }
    });

    const data = await redisResponse.json();

    if (!redisResponse.ok) {
      return response.status(500).json({
        ok: false,
        error: "redis_error",
        details: data
      });
    }

    const count = Number(data.result || 0);

    return response.status(200).json({
      ok: true,
      key: safeKey,
      count
    });
  } catch (error) {
    return response.status(500).json({
      ok: false,
      error: "server_error",
      message: error.message
    });
  }
}