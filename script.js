const params = new URLSearchParams(window.location.search);
const scansFromQuery = params.get("scans");

if (scansFromQuery) {
  const scanCount = document.getElementById("scanCount");
  if (scanCount) {
    scanCount.textContent = scansFromQuery + " SCANS";
  }
}