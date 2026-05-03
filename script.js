const params = new URLSearchParams(window.location.search);

const idFromQuery = params.get("id");
const nameFromQuery = params.get("name");
const scansFromQuery = params.get("scans");

const pathParts = window.location.pathname
  .split("/")
  .filter(Boolean);

const idFromPath = pathParts.length > 0 ? pathParts[pathParts.length - 1] : null;

const finalId = idFromQuery || idFromPath || "SEC-D02-001";

document.getElementById("capId").textContent = finalId.toUpperCase();

if (nameFromQuery) {
  document.getElementById("capName").textContent = nameFromQuery.toUpperCase();
}

if (scansFromQuery) {
  document.getElementById("scanCount").textContent = scansFromQuery + " SCANS";
}
