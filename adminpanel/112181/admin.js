(function(){
  "use strict";

  var API = "/api/admin-caps";
  var SESSION_KEY = "pcv_admin_pin_v3";

  var els = {};
  var state = {
    pin: "",
    brand: null,
    caps: [],
    editingCap: null,
    newImageDataUrl: null,
    newImageFileName: null
  };

  document.addEventListener("DOMContentLoaded", init);

  function init(){
    els.viewLogin = document.getElementById("view-login");
    els.viewBrands = document.getElementById("view-brands");
    els.viewCaps = document.getElementById("view-caps");

    els.loginForm = document.getElementById("login-form");
    els.loginPin = document.getElementById("login-pin");
    els.loginError = document.getElementById("login-error");

    els.brandGrid = document.getElementById("brand-grid");
    els.capsGrid = document.getElementById("caps-grid");
    els.capsTitle = document.getElementById("caps-title");
    els.capsEmpty = document.getElementById("caps-empty");
    els.backToBrands = document.getElementById("back-to-brands");

    els.editor = document.getElementById("editor");
    els.editorTitle = document.getElementById("editor-title");
    els.editorClose = document.getElementById("editor-close");
    els.editorCancel = document.getElementById("editor-cancel");
    els.editorSave = document.getElementById("editor-save");

    els.editorCurrentName = document.getElementById("editor-current-name");
    els.editorName = document.getElementById("editor-name");
    els.editorCurrentImage = document.getElementById("editor-current-image");
    els.editorFile = document.getElementById("editor-file");
    els.editorNewPreviewWrap = document.getElementById("editor-new-preview-wrap");
    els.editorNewPreview = document.getElementById("editor-new-preview");

    els.editorX = document.getElementById("editor-x");
    els.editorY = document.getElementById("editor-y");
    els.editorScale = document.getElementById("editor-scale");
    els.editorWidth = document.getElementById("editor-width");
    els.editorHeight = document.getElementById("editor-height");
    els.editorResetVisual = document.getElementById("editor-reset-visual");

    els.editorStatus = document.getElementById("editor-status");
    els.toast = document.getElementById("toast");
    els.logout = document.getElementById("logout");

    els.loginForm.addEventListener("submit", onLogin);
    els.backToBrands.addEventListener("click", showBrands);
    els.editorClose.addEventListener("click", closeEditor);
    els.editorCancel.addEventListener("click", closeEditor);
    els.editorSave.addEventListener("click", onSave);
    els.editorFile.addEventListener("change", onFileChange);
    els.logout.addEventListener("click", logout);
    els.editorResetVisual.addEventListener("click", resetVisualFields);

    if (els.editor) els.editor.hidden = true;
    if (els.editorNewPreviewWrap) els.editorNewPreviewWrap.hidden = true;
    if (els.editorStatus) els.editorStatus.hidden = true;

    var saved = sessionStorage.getItem(SESSION_KEY);
    if (saved){
      state.pin = saved;
      enterAdmin();
    }
  }

  function setView(view){
    els.viewLogin.classList.remove("active");
    els.viewBrands.classList.remove("active");
    els.viewCaps.classList.remove("active");
    view.classList.add("active");
  }

  function showToast(msg, kind){
    els.toast.textContent = msg;
    els.toast.className = "toast " + (kind || "");
    els.toast.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function(){
      els.toast.hidden = true;
    }, 3600);
  }

  function onLogin(e){
    e.preventDefault();
    state.pin = els.loginPin.value || "";
    sessionStorage.setItem(SESSION_KEY, state.pin);
    els.loginError.hidden = true;
    enterAdmin();
  }

  function logout(){
    sessionStorage.removeItem(SESSION_KEY);
    state.pin = "";
    els.logout.hidden = true;
    els.loginPin.value = "";
    setView(els.viewLogin);
  }

  function enterAdmin(){
    els.logout.hidden = false;
    loadBrands();
  }

  function api(path, opts){
    opts = opts || {};
    var headers = opts.headers || {};

    if (state.pin) headers["x-admin-password"] = state.pin;

    if (opts.body && typeof opts.body === "object"){
      headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(opts.body);
    }

    opts.headers = headers;

    return fetch(API + path, opts).then(function(r){
      if (r.status === 401){
        logout();
        var err = new Error("No autorizado");
        err.status = 401;
        throw err;
      }

      return r.json().then(function(j){
        return {
          status: r.status,
          json: j
        };
      });
    });
  }

  function loadBrands(){
    api("?action=list").then(function(r){
      if (!r.json || !r.json.ok){
        throw new Error((r.json && r.json.error) || "Error cargando marcas");
      }

      var brands = r.json.brands || [];
      els.brandGrid.innerHTML = "";

      brands.forEach(function(b){
        var btn = document.createElement("button");
        btn.className = "brand-btn";
        btn.innerHTML =
          '<div class="id">' + escapeHtml(b.id) + '</div>' +
          '<div class="label">' + escapeHtml(b.label) + '</div>';

        btn.addEventListener("click", function(){
          openBrand(b);
        });

        els.brandGrid.appendChild(btn);
      });

      setView(els.viewBrands);
    }).catch(function(e){
      if (e && e.status === 401){
        els.loginError.textContent = "PIN incorrecto.";
        els.loginError.hidden = false;
      } else {
        showToast(friendlyError(e.message || "Error"), "err");
      }
    });
  }

  function showBrands(){
    setView(els.viewBrands);
  }

  function openBrand(brand){
    state.brand = brand;
    els.capsTitle.textContent = brand.label.toUpperCase();
    els.capsGrid.innerHTML = '<div class="muted">Cargando gorras 001 a 020...</div>';
    els.capsEmpty.hidden = true;
    setView(els.viewCaps);

    api("?action=listCaps&brand=" + encodeURIComponent(brand.id)).then(function(r){
      if (!r.json || !r.json.ok){
        throw new Error((r.json && r.json.error) || "Error cargando gorras");
      }

      state.caps = r.json.caps || [];
      renderCaps();
    }).catch(function(e){
      if (e && e.status === 401) return;
      renderCapsError(e.message || "Error cargando gorras");
      showToast(friendlyError(e.message || "Error cargando gorras"), "err");
    });
  }

  function renderCaps(){
    els.capsGrid.innerHTML = "";

    if (!state.caps.length){
      els.capsEmpty.hidden = false;
      return;
    }

    els.capsEmpty.hidden = true;

    state.caps.forEach(function(c){
      var card = document.createElement("div");
      card.className = "cap-card";

      var thumbHtml = c.imageUrl
        ? '<img src="' + escapeAttr(c.imageUrl) + '" alt="" />'
        : '<span>sin imagen</span>';

      var visual = c.visualConfig || {};
      var visualText =
        'X ' + safeNumberText(visual.x) +
        ' / Y ' + safeNumberText(visual.y) +
        ' / S ' + safeNumberText(visual.scale);

      card.innerHTML =
        '<div class="thumb">' + thumbHtml + '</div>' +
        '<div class="num">CAP ' + escapeHtml(c.cap) + '</div>' +
        '<div class="name">' + escapeHtml(c.name || "(sin nombre)") + '</div>' +
        '<div class="visual-mini">' + escapeHtml(visualText) + '</div>' +
        '<div class="actions">' +
          '<button class="open">Abrir</button>' +
          '<button class="gear" title="Editar">&#9881;</button>' +
        '</div>';

      card.querySelector(".open").addEventListener("click", function(){
        window.open(c.publicUrl, "_blank", "noopener");
      });

      card.querySelector(".gear").addEventListener("click", function(){
        openEditor(c);
      });

      els.capsGrid.appendChild(card);
    });
  }

  function openEditor(cap){
    state.editingCap = cap;
    state.newImageDataUrl = null;
    state.newImageFileName = null;

    els.editorTitle.textContent = "Editar CAP " + cap.cap;
    els.editorCurrentName.textContent = cap.name || "(sin nombre)";
    els.editorName.value = cap.name || "";

    if (cap.imageUrl){
      els.editorCurrentImage.src = cap.imageUrl;
      els.editorCurrentImage.style.display = "";
    } else {
      els.editorCurrentImage.removeAttribute("src");
      els.editorCurrentImage.style.display = "none";
    }

    fillVisualFields(cap.visualConfig || {});

    els.editorFile.value = "";
    els.editorNewPreviewWrap.hidden = true;
    els.editorStatus.hidden = true;
    els.editor.hidden = false;
  }

  function closeEditor(){
    els.editor.hidden = true;
    state.editingCap = null;
    state.newImageDataUrl = null;
    state.newImageFileName = null;
  }

  function fillVisualFields(visual){
    els.editorX.value = valueOrDefault(visual.x, 0);
    els.editorY.value = valueOrDefault(visual.y, 0);
    els.editorScale.value = valueOrDefault(visual.scale, 1);
    els.editorWidth.value = valueOrDefault(visual.width, 335);
    els.editorHeight.value = valueOrDefault(visual.height, 260);
  }

  function resetVisualFields(){
    els.editorX.value = 0;
    els.editorY.value = 0;
    els.editorScale.value = 1;
    els.editorWidth.value = 335;
    els.editorHeight.value = 260;
  }

  function readVisualFields(){
    return {
      x: readNumberInput(els.editorX, 0),
      y: readNumberInput(els.editorY, 0),
      scale: readNumberInput(els.editorScale, 1),
      width: readNumberInput(els.editorWidth, 335),
      height: readNumberInput(els.editorHeight, 260)
    };
  }

  function readNumberInput(input, fallback){
    var n = Number(input.value);
    if (!isFinite(n)) return fallback;
    return n;
  }

  function valueOrDefault(value, fallback){
    var n = Number(value);
    if (!isFinite(n)) return fallback;
    return n;
  }

  function safeNumberText(value){
    var n = Number(value);
    if (!isFinite(n)) return "-";
    return String(n);
  }

  function onFileChange(e){
    var file = e.target.files && e.target.files[0];

    if (!file){
      state.newImageDataUrl = null;
      state.newImageFileName = null;
      els.editorNewPreviewWrap.hidden = true;
      return;
    }

    var ok = /^image\/(png|jpe?g|webp)$/i.test(file.type);

    if (!ok){
      showStatus("Formato no permitido. Usa PNG, JPG o WebP.", "err");
      els.editorFile.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024){
      showStatus("Imagen muy grande. Máximo 5 MB.", "err");
      els.editorFile.value = "";
      return;
    }

    var reader = new FileReader();

    reader.onload = function(){
      state.newImageDataUrl = reader.result;
      state.newImageFileName = file.name;
      els.editorNewPreview.src = reader.result;
      els.editorNewPreviewWrap.hidden = false;
      els.editorStatus.hidden = true;
    };

    reader.readAsDataURL(file);
  }

  function showStatus(msg, kind){
    els.editorStatus.textContent = msg;
    els.editorStatus.className = "status " + (kind || "");
    els.editorStatus.hidden = false;
  }

  function onSave(){
    if (!state.editingCap || !state.brand) return;

    var newName = (els.editorName.value || "").trim();

    if (!newName){
      showStatus("Escribe un nombre.", "err");
      return;
    }

    var visualConfig = readVisualFields();

    if (visualConfig.scale <= 0 || visualConfig.scale > 5){
      showStatus("Scale debe estar entre 0.1 y 5.", "err");
      return;
    }

    if (visualConfig.width < 80 || visualConfig.width > 900 || visualConfig.height < 80 || visualConfig.height > 900){
      showStatus("Width y Height deben estar entre 80 y 900 px.", "err");
      return;
    }

    var payload = {
      brand: state.brand.id,
      cap: state.editingCap.cap,
      capName: newName,
      visualConfig: visualConfig
    };

    if (state.newImageDataUrl){
      payload.imageBase64 = state.newImageDataUrl;
      payload.imageFileName = state.newImageFileName || "image";
    }

    els.editorSave.disabled = true;
    showStatus("Guardando cambios...", "");

    api("", {
      method: "POST",
      body: payload
    }).then(function(r){
      els.editorSave.disabled = false;

      if (!r.json || !r.json.ok){
        showStatus(friendlyError((r.json && r.json.error) || "Error al guardar"), "err");
        return;
      }

      showStatus("Guardado. Se actualizó nombre, imagen y configuración visual.", "ok");
      showToast("Guardado correctamente", "ok");

      var updated = r.json;
      var idx = -1;

      for (var i = 0; i < state.caps.length; i++){
        if (state.caps[i].cap === updated.cap){
          idx = i;
          break;
        }
      }

      if (idx >= 0){
        state.caps[idx].name = updated.name;

        if (updated.imageUrl){
          state.caps[idx].imageUrl = updated.imageUrl;
        }

        if (updated.visualConfig){
          state.caps[idx].visualConfig = updated.visualConfig;
        }
      }

      renderCaps();

      setTimeout(function(){
        closeEditor();
      }, 850);
    }).catch(function(e){
      els.editorSave.disabled = false;

      if (e && e.status === 401) return;

      showStatus(friendlyError(e.message || "Error"), "err");
    });
  }

  function friendlyError(message){
    var msg = String(message || "Error desconocido");

    if (msg.indexOf("GitHub rechazó el token") >= 0){
      return "GitHub rechazó el token. Revisa GITHUB_TOKEN en Vercel Production y vuelve a desplegar.";
    }

    if (msg.indexOf("GitHub respondió, pero no permitió") >= 0){
      return "GitHub respondió, pero no permitió el acceso. Revisa permisos del token.";
    }

    if (msg.indexOf("Faltan variables") >= 0){
      return "Faltan variables de entorno en Vercel. Revisa GITHUB_TOKEN, ADMIN_PASSWORD, GITHUB_OWNER, GITHUB_REPO y GITHUB_BRANCH.";
    }

    if (msg.indexOf("PIN incorrecto") >= 0 || msg.indexOf("No autorizado") >= 0){
      return "PIN incorrecto o sesión vencida. Vuelve a iniciar sesión.";
    }

    return msg;
  }

  function renderCapsError(message){
    var clean = friendlyError(message);

    els.capsGrid.innerHTML =
      '<div class="caps-error-card">' +
        '<div class="caps-error-title">No se pudieron cargar las gorras</div>' +
        '<div class="caps-error-text">' + escapeHtml(clean) + '</div>' +
        '<button id="retry-caps" class="primary retry-btn">Reintentar</button>' +
      '</div>';

    var retry = document.getElementById("retry-caps");

    if (retry && state.brand){
      retry.addEventListener("click", function(){
        openBrand(state.brand);
      });
    }
  }

  function escapeHtml(s){
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(s){
    return escapeHtml(s);
  }
})();