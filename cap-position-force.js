(function () {
  function readNumber(value, fallback) {
    var number = parseFloat(value);
    return Number.isFinite(number) ? number : fallback;
  }

  async function readPosition() {
    var result = {
      x: 0,
      y: 0,
      scale: 1.14
    };

    try {
      var response = await fetch("./position.txt?force=" + Date.now(), {
        method: "GET",
        cache: "no-store"
      });

      if (!response.ok) {
        return result;
      }

      var text = await response.text();
      var lines = String(text || "").split(/\r?\n/);

      lines.forEach(function (line) {
        var parts = line.split("=");

        if (parts.length !== 2) {
          return;
        }

        var key = parts[0].trim().toLowerCase();
        var value = parts[1].trim();

        if (key === "x") result.x = readNumber(value, result.x);
        if (key === "y") result.y = readNumber(value, result.y);
        if (key === "scale") result.scale = readNumber(value, result.scale);
      });
    } catch (error) {
      console.warn("No se pudo leer position.txt", error);
    }

    return result;
  }

  function applyPosition(values) {
    var image = document.getElementById("capMainImage");

    if (!image) {
      return;
    }

    var transformValue =
      "translate(" + values.x + "px, " + values.y + "px) scale(" + values.scale + ")";

    image.style.setProperty("--cap-shift-x", values.x + "px");
    image.style.setProperty("--cap-shift-y", values.y + "px");
    image.style.setProperty("--cap-scale", values.scale);

    image.style.setProperty("transform", transformValue, "important");
    image.style.setProperty("transform-origin", "center center", "important");
    image.style.setProperty("object-fit", "contain", "important");
    image.style.setProperty("object-position", "center center", "important");
    image.style.setProperty("visibility", "visible", "important");
  }

  async function run() {
    var values = await readPosition();
    applyPosition(values);
  }

  document.addEventListener("DOMContentLoaded", function () {
    run();
    setTimeout(run, 400);
    setTimeout(run, 1000);
    setTimeout(run, 1800);
  });
})();