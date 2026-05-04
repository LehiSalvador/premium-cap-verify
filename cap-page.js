function setTextFromFile() {
  const capNameElement = document.querySelector(".cap-name");

  if (!capNameElement) {
    return;
  }

  fetch("name.txt?t=" + Date.now(), {
    method: "GET",
    cache: "no-store"
  })
    .then(function (response) {
      if (!response.ok) {
        throw new Error("name_not_found");
      }

      return response.text();
    })
    .then(function (text) {
      const cleanText = text.trim();

      if (cleanText.length > 0) {
        capNameElement.textContent = cleanText.toUpperCase();
      }
    })
    .catch(function () {
      console.warn("No se pudo cargar name.txt. Se usara el texto default.");
    });
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

  const candidates = [
    capId + ".webp",
    capId + ".png",
    capId + ".jpg",
    capId + ".jpeg"
  ];

  let index = 0;

  function tryNextImage() {
    if (index >= candidates.length) {
      if (fallbackImage) {
        image.src = fallbackImage;
      }

      return;
    }

    image.src = candidates[index] + "?t=" + Date.now();
    index = index + 1;
  }

  image.onerror = tryNextImage;
  tryNextImage();
}

document.addEventListener("DOMContentLoaded", function () {
  setTextFromFile();
  loadCapImage();
});