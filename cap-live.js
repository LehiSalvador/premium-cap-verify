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

  function applyPosition(imageElement, x, y, scale) {
    if (!imageElement) return;

    imageElement.style.setProperty("--cap-shift-x", x + "px");
    imageElement.style.setProperty("--cap-shift-y", y + "px");
    imageElement.style.setProperty("--cap-scale", scale);

    /*
      Este transform inline es el fix fuerte:
      aunque haya CSS anterior con !important, el navegador aplicara este ajuste.
    */
    imageElement.style.transform =
      "translate(" + x + "px, " + y + "px) scale(" + scale + ")";

    imageElement.style.transformOrigin = "center center";
  }

  async function updateCapPosition() {
    var imageElement = document.getElementById("capMainImage");

    if (!imageElement) return;

    var values = {
      x: 0,
      y: 0,
      scale: 1.14
    };

    try {
      var response = await fetch("./position.txt?live=" + Date.now(), {
        method: "GET",
        cache: "no-store"
      });

      if (!response.ok) throw new Error("position_not_found");

      var text = await response.text();
      var lines = String(text || "").split(/\r?\n/);

      lines.forEach(function (line) {
        var parts = line.split("=");

        if (parts.length !== 2) return;

        var key = parts[0].trim().toLowerCase();
        var value = parseFloat(parts[1].trim());

        if (!Number.isFinite(value)) return;

        if (key === "x") values.x = value;
        if (key === "y") values.y = value;
        if (key === "scale") values.scale = value;
      });
    } catch (error) {
      console.warn("No se pudo leer position.txt. Se usara posicion default.");
    }

    applyPosition(imageElement, values.x, values.y, values.scale);
  }

  document.addEventListener("DOMContentLoaded", function () {
    updateCapName();
    updateCapImage();
    updateCapPosition();

    /*
      Reaplicar despues de un momento evita que Safari/iPhone
      ignore el primer ajuste por cache o por carga tardia.
    */
    setTimeout(updateCapPosition, 500);
    setTimeout(updateCapPosition, 1200);
  });
})();