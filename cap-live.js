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

    if (!capNameElement) {
      return;
    }

    try {
      var response = await fetch("./name.txt?live=" + Date.now(), {
        method: "GET",
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("name_not_found");
      }

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
      console.warn("No se pudo leer name.txt. Se mantiene el nombre default.", error);
    }
  }

  function imageCanLoad(url) {
    return new Promise(function (resolve) {
      var probe = new Image();

      probe.onload = function () {
        if (probe.naturalWidth > 10 && probe.naturalHeight > 10) {
          resolve(true);
        } else {
          resolve(false);
        }
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

    if (!imageElement || !data.capId) {
      return;
    }

    var capId = data.capId;

    /*
      IMPORTANTE:
      Primero buscamos la imagen original que tu subes:
      002.png, 002.jpg, 002.webp, etc.

      Al final buscamos 002-clean.png.
      Asi evitamos que una imagen clean vieja o equivocada reemplace
      la imagen correcta que acabas de subir.
    */

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

    /*
      Si no encuentra imagen nueva, NO reemplaza por otra cosa.
      Esto evita que cargue bien al inicio y luego cambie a una imagen
      que no corresponde.
    */

    if (imageElement.getAttribute("src")) {
      imageElement.style.visibility = "visible";
      return;
    }

    if (data.brandImage) {
      imageElement.src = bust(data.brandImage);
      imageElement.style.visibility = "visible";
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    updateCapName();
    updateCapImage();
  });
})();