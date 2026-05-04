(function () {
  function bust(url) {
    if (!url) return url;
    return url + (url.indexOf("?") >= 0 ? "&" : "?") + "live=" + Date.now();
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

      if (!response.ok) return;

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

  function sameImage(currentSrc, candidate) {
    try {
      var current = new URL(currentSrc, window.location.href);
      var next = new URL(candidate, window.location.href);
      return current.pathname.toLowerCase() === next.pathname.toLowerCase();
    } catch (error) {
      return false;
    }
  }

  async function updateCapImage() {
    var imageElement = document.getElementById("capMainImage");
    var capId = document.body.getAttribute("data-cap-id") || "";
    var brandImage = document.body.getAttribute("data-brand-image") || "";

    if (!imageElement || !capId) return;

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

      if (await imageCanLoad(candidate)) {
        if (!sameImage(imageElement.src, candidate)) {
          imageElement.src = bust(candidate);
        }

        imageElement.classList.add("cap-photo-img-clean");
        imageElement.style.visibility = "visible";
        return;
      }
    }

    if (imageElement.getAttribute("src")) {
      imageElement.style.visibility = "visible";
      return;
    }

    if (brandImage) {
      imageElement.src = bust(brandImage);
      imageElement.style.visibility = "visible";
    }
  }

  async function initCapPage() {
    await updateCapName();
    await updateCapImage();
  }

  document.addEventListener("DOMContentLoaded", initCapPage);
})();