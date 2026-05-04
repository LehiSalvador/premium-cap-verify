(function () {
  function bust(url) {
    if (!url) return url;
    return url + (url.indexOf("?") >= 0 ? "&" : "?") + "live=" + Date.now();
  }

  function getBodyData() {
    var body = document.body;

    return {
      capId: body.getAttribute("data-cap-id") || "",
      brandSlug: body.getAttribute("data-brand-slug") || "",
      brandName: body.getAttribute("data-brand-name") || "",
      brandImage: body.getAttribute("data-brand-image") || ""
    };
  }

  function readNumber(value, fallback) {
    var number = parseFloat(value);
    return Number.isFinite(number) ? number : fallback;
  }

  async function updateCapName() {
    var capNameElement = document.querySelector(".cap-name");
    var imageElement = document.getElementById("capMainImage");

    if (!capNameElement) return;

    try {
      var response = await fetch("./name.txt?live=" + Date.now(), {
        method: "GET",
        cache: "no-store"
      });

      if (!response.ok) throw new Error("name_not_found");

      var text = await response.text();
      var cleanText = String(text || "").trim();

      if (cleanText.length > 0) {
        var finalName = cleanText.toUpperCase();

        capNameElement.textContent = finalName;
        document.title = finalName + " | Premium Cap Verify";

        if (imageElement) {
          imageElement.alt = finalName;
        }
      }
    } catch (error) {
      console.warn("No se pudo leer name.txt.", error);
    }
  }

  function imageCanLoad(url) {
    return new Promise(function (resolve) {
      var probe = new Image();

      probe.onload = function () {
        resolve(probe.naturalWidth > 10 && probe.naturalHeight > 10);
      };

      probe.onerror = function () {
        resolve(false);
      };

      probe.src = bust(url);
    });
  }

  async function updateCapImage() {
    var data = getBodyData();
    var imageElement = document.getElementById("capMainImage");

    if (!imageElement || !data.capId) return;

    var capId = data.capId;

    var candidates = [
      "./" + capId + ".png",
      "./" + capId + ".PNG",
      "./" + capId + ".jpg",
      "./" + capId + ".JPG",
      "./" + capId + ".jpeg",
      "./" + capId + ".JPEG",
      "./" + capId + ".webp",
      "./" + capId + ".WEBP",
      "./" + capId + "-clean.png",
      "./" + capId + "-clean.PNG"
    ];

    for (var i = 0; i < candidates.length; i++) {
      var candidate = candidates[i];
      var works = await imageCanLoad(candidate);

      if (works) {
        imageElement.src = bust(candidate);
        imageElement.classList.add("cap-photo-img-clean");
        imageElement.style.visibility = "visible";
        return;
      }
    }

    if (imageElement.getAttribute("src")) {
      imageElement.style.visibility = "visible";
      return;
    }

    if (data.brandImage) {
      imageElement.src = bust(data.brandImage);
      imageElement.style.visibility = "visible";
    }
  }

  async function readPosition() {
    var values = {
      x: 0,
      y: 0,
      scale: 1.18
    };

    try {
      var response = await fetch("./position.txt?live=" + Date.now(), {
        method: "GET",
        cache: "no-store"
      });

      if (!response.ok) return values;

      var text = await response.text();
      var lines = String(text || "").split(/\r?\n/);

      lines.forEach(function (line) {
        var parts = line.split("=");

        if (parts.length !== 2) return;

        var key = parts[0].trim().toLowerCase();
        var value = parts[1].trim();

        if (key === "x") values.x = readNumber(value, values.x);
        if (key === "y") values.y = readNumber(value, values.y);
        if (key === "scale") values.scale = readNumber(value, values.scale);
      });
    } catch (error) {
      console.warn("No se pudo leer position.txt.", error);
    }

    return values;
  }

  function applyPosition(values) {
    var imageElement = document.getElementById("capMainImage");

    if (!imageElement) return;

    var transformValue =
      "translate(" + values.x + "px, " + values.y + "px) scale(" + values.scale + ")";

    imageElement.style.setProperty("--cap-shift-x", values.x + "px");
    imageElement.style.setProperty("--cap-shift-y", values.y + "px");
    imageElement.style.setProperty("--cap-scale", values.scale);

    imageElement.style.setProperty("transform", transformValue, "important");
    imageElement.style.setProperty("transform-origin", "center center", "important");
    imageElement.style.setProperty("object-fit", "contain", "important");
    imageElement.style.setProperty("object-position", "center center", "important");
    imageElement.style.setProperty("visibility", "visible", "important");
  }

  async function updateCapPosition() {
    var values = await readPosition();
    applyPosition(values);
  }

  async function initCapPage() {
    await updateCapName();
    await updateCapImage();
    await updateCapPosition();

    setTimeout(updateCapPosition, 500);
    setTimeout(updateCapPosition, 1200);
  }

  document.addEventListener("DOMContentLoaded", initCapPage);
})();