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
        resolve(true);
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

    var candidates = [
      "./" + capId + "-clean.png",
      "./" + capId + "-clean.PNG",
      "./" + capId + ".png",
      "./" + capId + ".PNG",
      "./" + capId + ".webp",
      "./" + capId + ".WEBP",
      "./" + capId + ".jpg",
      "./" + capId + ".JPG",
      "./" + capId + ".jpeg",
      "./" + capId + ".JPEG"
    ];

    for (var i = 0; i < candidates.length; i++) {
      var candidate = candidates[i];
      var works = await imageCanLoad(candidate);

      if (works) {
        imageElement.src = bust(candidate);
        imageElement.classList.add("cap-photo-img-clean");
        return;
      }
    }

    if (data.brandImage) {
      imageElement.src = bust(data.brandImage);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    updateCapName();
    updateCapImage();
  });
})();