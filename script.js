const params = new URLSearchParams(window.location.search);

const scansFromQuery = params.get("scans");

if (scansFromQuery) {
  document.getElementById("scanCount").textContent = scansFromQuery + " SCANS";
}
