(function () {
  function getFolderBaseUrl() {
    return new URL("./", window.location.href);
  }

  function addNoCache(url) {
    url.searchParams.set("v", Date.now().toString());
    return url.href;
  }

  async function setTextFromFile() {
    const capNameElement = document.querySelector(".cap-name");

    if (!capNameElement) {
      return;
    }

    try {
      const folderBase = getFolderBaseUrl();
      const nameUrl = new URL("name.txt", folderBase);
      const response = await fetch(addNoCache(nameUrl), {
        method: "GET",
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("name_not_found");
      }

      const text = await response.text();
      const cleanText = text.trim();

      if (cleanText.length > 0) {
        capNameElement.textContent = cleanText.toUpperCase();
      }
    } catch (error) {
      console.warn("No se pudo cargar name.txt. Se usara el texto default.", error);
    }
  }

  function loadCapImage() {
    const body = document.body;
    const image = document.getElementById("capMainImage");

    if (!image) {
      return;
    }

    const capId = body.dataset.capId;
    const fallbackImage = body.dataset.brandImage;

    if (!capId) {
      return;
    }

    const folderBase = getFolderBaseUrl();

    const candidates = [
      capId + ".webp",
      capId + ".png",
      capId + ".jpg",
      capId + ".jpeg"
    ];

    let index = 0;

    function tryNextImage() {
      if (index >= candidates.length) {
        image.onerror = null;

        if (fallbackImage) {
          image.src = fallbackImage;
        }

        return;
      }

      const imageUrl = new URL(candidates[index], folderBase);
      index = index + 1;
      image.src = addNoCache(imageUrl);
    }

    image.onerror = tryNextImage;
    tryNextImage();
  }

  document.addEventListener("DOMContentLoaded", function () {
    setTextFromFile();
    loadCapImage();
  });
})();