(function(){
  "use strict";

  var MIN_VISIBLE_MS = 1550;
  var BURN_MS = 1050;
  var HARD_LIMIT_MS = 4200;

  var startedAt = Date.now();
  var finished = false;

  function ready(fn){
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function getBrandFromPath(){
    var parts = window.location.pathname.split("/").filter(Boolean);
    return parts[0] || "";
  }

  function tryLogoSources(img, brand){
    var sources = [
      "/assets/logos-marcas/" + brand + ".webp",
      "/assets/logos-marcas/" + brand + ".png",
      "/assets/logos-marcas/" + brand + ".jpg",
      "/assets/logos-marcas/" + brand + ".jpeg",
      "/assets/logos-marcas/" + brand + ".svg",
      "/assets/brands/" + brand + ".svg"
    ];

    var index = 0;

    function next(){
      if (index >= sources.length) {
        img.style.display = "none";
        return;
      }

      var src = sources[index] + "?v=" + Date.now();
      index += 1;

      var test = new Image();

      test.onload = function(){
        img.src = src;
        img.style.display = "";
      };

      test.onerror = next;
      test.src = src;
    }

    next();
  }

  function finishLoader(){
    if (finished) return;
    finished = true;

    var overlay = document.getElementById("pcv-brand-loader");
    if (!overlay) {
      document.documentElement.classList.remove("pcv-loader-active");
      return;
    }

    var elapsed = Date.now() - startedAt;
    var wait = Math.max(0, MIN_VISIBLE_MS - elapsed);

    window.setTimeout(function(){
      overlay.classList.add("pcv-loader-burn");

      window.setTimeout(function(){
        if (overlay && overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }

        document.documentElement.classList.remove("pcv-loader-active");
      }, BURN_MS + 80);
    }, wait);
  }

  ready(function(){
    var overlay = document.getElementById("pcv-brand-loader");

    if (!overlay) return;

    document.documentElement.classList.add("pcv-loader-active");

    var brand = overlay.getAttribute("data-brand") || getBrandFromPath();
    var img = overlay.querySelector(".pcv-loader-logo");

    if (img && brand) {
      tryLogoSources(img, brand);
    }

    if (document.readyState === "complete") {
      finishLoader();
    } else {
      window.addEventListener("load", finishLoader, { once: true });
    }

    window.setTimeout(finishLoader, HARD_LIMIT_MS);
  });
})();