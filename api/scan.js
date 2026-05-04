const COUNTER_NAMESPACE = "premiumcapverify-site-reset-20260504031832";
const BASE_SCAN_OFFSET = 0;

function cleanKey(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function extractCount(data) {
  const candidates = [
    data && data.count,
    data && data.value,
    data && data.data,
    data && data.result,
    data && data.counter && data.counter.count,
    data && data.counter && data.counter.value,
    data && data.data && data.data.count,
    data && data.data && data.data.value,
    data && data.result && data.result.count,
    data && data.result && data.result.value
  ];

  for (const item of candidates) {
    const number = Number(item);
    if (Number.isFinite(number)) {
      return number;
    }
  }

  const text = JSON.stringify(data || {});
  const match = text.match(/"(count|value|data|result)"\s*:\s*(\d+)/i);

  if (match) {
    return Number(match[2]);
  }

  return null;
}

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  response.setHeader("Pragma", "no-cache");
  response.setHeader("Expires", "0");

  try {
    if (request.method !== "GET" && request.method !== "POST") {
      return response.status(405).json({
        ok: false,
        error: "method_not_allowed"
      });
    }

    const safeKey = cleanKey(request.query.key);

    if (!safeKey) {
      return response.status(400).json({
        ok: false,
        error: "missing_key"
      });
    }

    const counterUrl =
      "https://api.counterapi.dev/v1/" +
      encodeURIComponent(COUNTER_NAMESPACE) +
      "/" +
      encodeURIComponent(safeKey) +
      "/up";

    const counterResponse = await fetch(counterUrl, {
      method: "GET",
      cache: "no-store"
    });

    const data = await counterResponse.json().catch(function () {
      return {};
    });

    if (!counterResponse.ok) {
      return response.status(500).json({
        ok: false,
        error: "counter_api_error",
        details: data
      });
    }

    const realCount = extractCount(data);

    if (!Number.isFinite(realCount)) {
      return response.status(500).json({
        ok: false,
        error: "invalid_counter_response",
        details: data
      });
    }

    const displayCount = realCount + BASE_SCAN_OFFSET;

    return response.status(200).json({
      ok: true,
      key: safeKey,
      realCount: realCount,
      baseOffset: BASE_SCAN_OFFSET,
      count: displayCount,
      namespace: COUNTER_NAMESPACE
    });
  } catch (error) {
    return response.status(500).json({
      ok: false,
      error: "server_error",
      message: error.message
    });
  }
}