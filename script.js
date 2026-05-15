function formatScans(count) {
  const number = Number(count);

  if (!Number.isFinite(number)) {
    return "SCAN ERROR";
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
    .replace(/\/+/g, "-")
    .replace(/-+/g, "-");

  return cleanPath || "home";
}

function updateScanLabel(scanElement) {
  if (!scanElement || !scanElement.parentElement) {
    return;
  }

  const label = scanElement.parentElement.querySelector("p");

  if (!label) {
    return;
  }

  label.textContent = "48H SCAN COUNT";
}

async function updateScanCount() {
  const scanElement = document.getElementById("scanCount");

  if (!scanElement) {
    return;
  }

  updateScanLabel(scanElement);

  const scanKey = getScanKey();

  try {
    scanElement.textContent = "LOADING";

    const response = await fetch("/api/scan?key=" + encodeURIComponent(scanKey) + "&t=" + Date.now(), {
      method: "GET",
      cache: "no-store"
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      console.error("Scan counter error:", data);
      scanElement.textContent = "SCAN ERROR";
      return;
    }

    scanElement.textContent = formatScans(data.count);

    if (data.nextResetAt) {
      scanElement.title = "This 48-hour counter resets at " + data.nextResetAt;
    }
  } catch (error) {
    console.error("Scan counter request failed:", error);
    scanElement.textContent = "SCAN ERROR";
  }
}

document.addEventListener("DOMContentLoaded", updateScanCount);