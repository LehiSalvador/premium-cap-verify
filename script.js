function formatScans(count) {
  const number = Number(count);

  if (!Number.isFinite(number)) {
    return "2 SCANS";
  }

  if (number === 1) {
    return "1 SCAN";
  }

  return number + " SCANS";
}

function getScanKey() {
  const scanElement = document.getElementById("scanCount");

  if (scanElement && scanElement.dataset.scanKey) {
    return scanElement.dataset.scanKey;
  }

  const cleanPath = window.location.pathname
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^a-z0-9/-]/g, "-")
    .replace(/\/+/g, ":");

  return cleanPath || "home";
}

async function updateScanCount() {
  const scanElement = document.getElementById("scanCount");

  if (!scanElement) {
    return;
  }

  const scanKey = getScanKey();

  try {
    scanElement.textContent = "LOADING";

    const response = await fetch("/api/scan?key=" + encodeURIComponent(scanKey), {
      method: "GET",
      cache: "no-store"
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      console.error("Scan counter error:", data);
      scanElement.textContent = "2 SCANS";
      return;
    }

    scanElement.textContent = formatScans(data.count);
  } catch (error) {
    console.error("Scan counter request failed:", error);
    scanElement.textContent = "2 SCANS";
  }
}

document.addEventListener("DOMContentLoaded", updateScanCount);