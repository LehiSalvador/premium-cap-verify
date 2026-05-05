(function(){
  "use strict";

  var TOTAL_MS = 6000;
  var HOLD_MS = 2600;
  var BURN_MS = TOTAL_MS - HOLD_MS;

  var started = false;
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

  function formatBrandName(slug){
    if (!slug) return "PREMIUM CAP";
    return slug
      .replace(/-/g, " ")
      .replace(/\b\w/g, function(c){ return c.toUpperCase(); });
  }

  function ensureOverlay(){
    var brand = getBrandFromPath();
    var overlay = document.getElementById("pcv-brand-loader");

    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "pcv-brand-loader";
      overlay.className = "pcv-brand-loader";
      overlay.setAttribute("aria-hidden", "true");
      overlay.setAttribute("data-brand", brand);

      overlay.innerHTML =
        '<div class="pcv-loader-logo-wrap">' +
          '<span class="pcv-loader-ring"></span>' +
          '<img class="pcv-loader-logo" alt="" />' +
          '<span class="pcv-loader-scan"></span>' +
        '</div>';

      if (document.body.firstChild) {
        document.body.insertBefore(overlay, document.body.firstChild);
      } else {
        document.body.appendChild(overlay);
      }
    }

    if (!overlay.getAttribute("data-brand")) {
      overlay.setAttribute("data-brand", brand);
    }

    if (!overlay.querySelector(".pcv-burn-edge")) {
      var edge = document.createElement("span");
      edge.className = "pcv-burn-edge";
      overlay.appendChild(edge);
    }

    if (!overlay.querySelector(".pcv-burn-sparks")) {
      var sparks = document.createElement("span");
      sparks.className = "pcv-burn-sparks";
      overlay.appendChild(sparks);
    }

    if (!overlay.querySelector(".pcv-loader-brand-text")) {
      var brandText = document.createElement("div");
      brandText.className = "pcv-loader-brand-text";
      brandText.textContent = formatBrandName(overlay.getAttribute("data-brand") || brand);
      overlay.appendChild(brandText);
    }

    if (!overlay.querySelector(".pcv-loader-subtext")) {
      var subText = document.createElement("div");
      subText.className = "pcv-loader-subtext";
      subText.textContent = "AUTHENTIC VERIFICATION";
      overlay.appendChild(subText);
    }

    overlay.style.setProperty("--pcv-burn", "0%");
    return overlay;
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

  function easeOutCubic(t){
    return 1 - Math.pow(1 - t, 3);
  }

  function startBurn(overlay){
    if (!overlay || finished) return;

    overlay.classList.add("pcv-loader-burning");

    var start = performance.now();

    function frame(now){
      if (finished) return;

      var raw = Math.min(1, (now - start) / BURN_MS);
      var eased = easeOutCubic(raw);
      var burn = eased * 168;

      overlay.style.setProperty("--pcv-burn", burn.toFixed(2) + "%");

      if (raw < 1) {
        requestAnimationFrame(frame);
      } else {
        finish(overlay);
      }
    }

    requestAnimationFrame(frame);
  }

  function finish(overlay){
    if (finished) return;
    finished = true;

    if (overlay) {
      overlay.style.setProperty("--pcv-burn", "180%");
      overlay.style.opacity = "0";
      overlay.style.transition = "opacity 240ms ease";

      window.setTimeout(function(){
        if (overlay && overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }

        document.documentElement.classList.remove("pcv-loader-active");
      }, 260);
    } else {
      document.documentElement.classList.remove("pcv-loader-active");
    }
  }

  function boot(){
    if (started) return;
    started = true;

    var overlay = ensureOverlay();

    document.documentElement.classList.add("pcv-loader-active");

    var brand = overlay.getAttribute("data-brand") || getBrandFromPath();
    var img = overlay.querySelector(".pcv-loader-logo");

    if (img && brand) {
      tryLogoSources(img, brand);
    }

    window.setTimeout(function(){
      startBurn(overlay);
    }, HOLD_MS);

    window.setTimeout(function(){
      finish(overlay);
    }, TOTAL_MS + 180);
  }

  ready(boot);

  window.addEventListener("pageshow", function(event){
    if (event.persisted) {
      window.location.reload();
    }
  });
})();