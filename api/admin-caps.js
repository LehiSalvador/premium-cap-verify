// api/admin-caps.js
// Premium Cap Verify Admin API
// Vercel serverless. CommonJS. Node 18+.

const ALLOWED_BRANDS = [
  { id: "barbas-hats",     label: "Barbas Hats" },
  { id: "dandy-hats",      label: "Dandy Hats" },
  { id: "rude-awakenings", label: "Rude Awakenings" },
  { id: "31-hats",         label: "31 Hats" },
  { id: "gallo-fino",      label: "Gallo Fino" },
  { id: "jc-hats",         label: "JC Hats" },
  { id: "baez",            label: "Baez" }
];

const CAP_NUMBERS = Array.from({ length: 20 }, (_, i) => String(i + 1).padStart(3, "0"));

const IMAGE_EXT_BY_MIME = {
  "image/webp": "webp",
  "image/png":  "png",
  "image/jpeg": "jpg",
  "image/jpg":  "jpg"
};

const IMAGE_EXTS = ["webp", "png", "jpg", "jpeg"];

function sendJson(res, status, payload){
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function requireEnv(){
  const env = {
    owner: process.env.GITHUB_OWNER,
    repo: process.env.GITHUB_REPO,
    branch: process.env.GITHUB_BRANCH || "main",
    token: process.env.GITHUB_TOKEN,
    adminPassword: process.env.ADMIN_PASSWORD
  };

  const missing = [];
  if (!env.owner) missing.push("GITHUB_OWNER");
  if (!env.repo) missing.push("GITHUB_REPO");
  if (!env.token) missing.push("GITHUB_TOKEN");
  if (!env.adminPassword) missing.push("ADMIN_PASSWORD");

  if (missing.length){
    const e = new Error("Faltan variables de entorno en Vercel: " + missing.join(", "));
    e.statusCode = 500;
    throw e;
  }

  return env;
}

function validatePassword(req, env){
  const provided = (req.headers && req.headers["x-admin-password"]) || "";
  if (!provided || provided !== env.adminPassword){
    const e = new Error("PIN incorrecto o sesión vencida.");
    e.statusCode = 401;
    throw e;
  }
}

function validateBrand(brand){
  const found = ALLOWED_BRANDS.find(b => b.id === brand);
  if (!found){
    const e = new Error("Marca inválida.");
    e.statusCode = 400;
    throw e;
  }
  return found;
}

function normalizeCap(value){
  const raw = String(value || "").trim();
  if (!/^\d{1,4}$/.test(raw)){
    const e = new Error("Número de gorra inválido.");
    e.statusCode = 400;
    throw e;
  }
  return raw.padStart(3, "0");
}

function escapeHtml(value){
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function encodeRepoPath(p){
  return p.split("/").map(encodeURIComponent).join("/");
}

async function githubRequest(env, apiPath, options){
  const url = "https://api.github.com" + apiPath;

  const headers = Object.assign({
    "Authorization": "Bearer " + env.token,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "premium-cap-verify-admin"
  }, (options && options.headers) || {});

  const init = {
    method: (options && options.method) || "GET",
    headers
  };

  if (options && options.body) init.body = options.body;

  const resp = await fetch(url, init);
  const text = await resp.text();

  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (_) {
    json = null;
  }

  return {
    ok: resp.ok,
    status: resp.status,
    json,
    text
  };
}

function githubError(prefix, status){
  let detail = prefix + ": " + status;

  if (status === 401) {
    detail = "GitHub rechazó el token. Revisa GITHUB_TOKEN en Vercel Production y vuelve a desplegar.";
  }

  if (status === 403) {
    detail = "GitHub respondió, pero no permitió el acceso. Revisa que el token tenga permiso repo o Contents Read/Write.";
  }

  if (status === 404) {
    detail = "GitHub no encontró la ruta solicitada.";
  }

  const e = new Error(detail);
  e.statusCode = 502;
  throw e;
}

async function githubGetContent(env, repoPath){
  const path = "/repos/" + env.owner + "/" + env.repo + "/contents/" + encodeRepoPath(repoPath) + "?ref=" + encodeURIComponent(env.branch);
  const r = await githubRequest(env, path, { method: "GET" });

  if (r.status === 404) return null;
  if (!r.ok) githubError("GitHub get failed", r.status);

  return r.json;
}

async function githubPutContent(env, repoPath, contentBufferOrString, message){
  const existing = await githubGetContent(env, repoPath);

  const buffer = Buffer.isBuffer(contentBufferOrString)
    ? contentBufferOrString
    : Buffer.from(String(contentBufferOrString), "utf8");

  const body = {
    message: message,
    content: buffer.toString("base64"),
    branch: env.branch
  };

  if (existing && existing.sha) {
    body.sha = existing.sha;
  }

  const path = "/repos/" + env.owner + "/" + env.repo + "/contents/" + encodeRepoPath(repoPath);

  const r = await githubRequest(env, path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!r.ok) githubError("GitHub put failed", r.status);

  return r.json;
}

async function getTextFile(env, repoPath){
  const item = await githubGetContent(env, repoPath);
  if (!item || !item.content) return "";
  return Buffer.from(item.content, "base64").toString("utf8").trim();
}

async function findExactImage(env, brand, cap){
  for (const ext of IMAGE_EXTS){
    const imagePath = brand + "/caps/" + cap + "/" + cap + "." + ext;
    const item = await githubGetContent(env, imagePath);
    if (item && item.type === "file"){
      return {
        path: imagePath,
        name: cap + "." + ext
      };
    }
  }

  return null;
}

async function getCapInfo(env, brand, cap){
  const dir = brand + "/caps/" + cap;

  let name = "";
  let hasIndex = false;
  let image = null;

  const indexItem = await githubGetContent(env, dir + "/index.html");
  if (indexItem && indexItem.type === "file"){
    hasIndex = true;
  }

  try {
    name = await getTextFile(env, dir + "/name.txt");
  } catch (_) {
    name = "";
  }

  try {
    image = await findExactImage(env, brand, cap);
  } catch (_) {
    image = null;
  }

  const publicUrl = "/" + brand + "/caps/" + cap + "/";
  const imageUrl = image ? "/" + image.path + "?v=" + Date.now() : null;

  return {
    cap,
    exists: hasIndex,
    name: name || ("CAP " + cap),
    publicUrl,
    imageUrl,
    imagePath: image ? image.path : null
  };
}

function decodeDataUrlImage(dataUrl){
  if (typeof dataUrl !== "string") return null;

  const m = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!m) return null;

  const mime = m[1].toLowerCase();
  const ext = IMAGE_EXT_BY_MIME[mime];

  if (!ext) return null;

  let buffer;
  try {
    buffer = Buffer.from(m[2], "base64");
  } catch (_) {
    return null;
  }

  if (!buffer || buffer.length === 0) return null;
  if (buffer.length > 5 * 1024 * 1024) return null;

  return {
    mime,
    ext,
    buffer
  };
}

function updateIndexHtml(html, capName, imagePublicSrc){
  let updated = html;
  let changedName = false;
  let changedImage = false;

  const reCapName = /(<p[^>]*class=["'][^"']*\bcap-name\b[^"']*["'][^>]*>)([\s\S]*?)(<\/p>)/i;

  if (reCapName.test(updated)){
    updated = updated.replace(reCapName, function(_full, open, _inner, close){
      changedName = true;
      return open + escapeHtml(capName) + close;
    });
  }

  if (imagePublicSrc){
    const reImg = /<img\b[^>]*\bclass=["'][^"']*\bcap-photo-img-clean\b[^"']*["'][^>]*>/i;
    const m = updated.match(reImg);

    if (m){
      let tag = m[0];

      if (/\bsrc=["'][^"']*["']/i.test(tag)){
        tag = tag.replace(/\bsrc=["'][^"']*["']/i, 'src="' + imagePublicSrc + '"');
      } else {
        tag = tag.replace(/<img\b/i, '<img src="' + imagePublicSrc + '"');
      }

      if (/\bdata-cap-image=["'][^"']*["']/i.test(tag)){
        tag = tag.replace(/\bdata-cap-image=["'][^"']*["']/i, 'data-cap-image="' + imagePublicSrc + '"');
      } else {
        tag = tag.replace(/<img\b/i, '<img data-cap-image="' + imagePublicSrc + '"');
      }

      updated = updated.replace(reImg, tag);
      changedImage = true;
    }
  } else {
    changedImage = true;
  }

  return {
    html: updated,
    changedName,
    changedImage
  };
}

async function readJsonBody(req){
  if (req.body && typeof req.body === "object") return req.body;

  if (typeof req.body === "string"){
    try {
      return JSON.parse(req.body);
    } catch (_) {
      const e = new Error("JSON inválido.");
      e.statusCode = 400;
      throw e;
    }
  }

  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];
    const MAX = 6 * 1024 * 1024;

    req.on("data", chunk => {
      total += chunk.length;

      if (total > MAX){
        const e = new Error("Payload demasiado grande.");
        e.statusCode = 413;
        reject(e);
        try { req.destroy(); } catch (_) {}
        return;
      }

      chunks.push(chunk);
    });

    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (_) {
        const e = new Error("JSON inválido.");
        e.statusCode = 400;
        reject(e);
      }
    });

    req.on("error", reject);
  });
}

module.exports = async function handler(req, res){
  try {
    const env = requireEnv();
    const method = req.method || "GET";
    const url = new URL(req.url, "http://localhost");
    const action = url.searchParams.get("action") || "";

    if (method === "GET"){
      validatePassword(req, env);

      if (action === "list"){
        return sendJson(res, 200, {
          ok: true,
          brands: ALLOWED_BRANDS
        });
      }

      if (action === "listCaps"){
        const brand = url.searchParams.get("brand") || "";
        validateBrand(brand);

        const caps = [];

        for (const cap of CAP_NUMBERS){
          const info = await getCapInfo(env, brand, cap);
          caps.push(info);
        }

        return sendJson(res, 200, {
          ok: true,
          brand,
          caps
        });
      }

      if (action === "cap"){
        const brand = url.searchParams.get("brand") || "";
        const cap = normalizeCap(url.searchParams.get("cap") || "");

        validateBrand(brand);

        const info = await getCapInfo(env, brand, cap);

        return sendJson(res, 200, {
          ok: true,
          brand,
          ...info
        });
      }

      return sendJson(res, 400, {
        ok: false,
        error: "Acción desconocida."
      });
    }

    if (method === "POST"){
      validatePassword(req, env);

      const body = await readJsonBody(req);

      const brand = String(body.brand || "").trim();
      const cap = normalizeCap(body.cap || "");
      const capName = String(body.capName || "").trim();

      validateBrand(brand);

      if (!capName || capName.length > 200){
        return sendJson(res, 400, {
          ok: false,
          error: "Nombre inválido."
        });
      }

      const dir = brand + "/caps/" + cap;
      const indexPath = dir + "/index.html";

      const indexItem = await githubGetContent(env, indexPath);

      if (!indexItem || !indexItem.content){
        return sendJson(res, 404, {
          ok: false,
          error: "No existe index.html para esta gorra."
        });
      }

      let imagePath = null;

      if (body.imageBase64){
        const decoded = decodeDataUrlImage(body.imageBase64);

        if (!decoded){
          return sendJson(res, 400, {
            ok: false,
            error: "Imagen inválida. Usa PNG, JPG o WebP menor a 5 MB."
          });
        }

        imagePath = dir + "/" + cap + "." + decoded.ext;

        await githubPutContent(
          env,
          imagePath,
          decoded.buffer,
          "admin: update image " + brand + "/" + cap
        );
      } else {
        const existingImage = await findExactImage(env, brand, cap);
        if (existingImage) imagePath = existingImage.path;
      }

      await githubPutContent(
        env,
        dir + "/name.txt",
        capName,
        "admin: update name " + brand + "/" + cap
      );

      const currentHtml = Buffer.from(indexItem.content, "base64").toString("utf8");
      const imageSrc = imagePath ? "/" + imagePath + "?v=" + Date.now() : null;

      const result = updateIndexHtml(currentHtml, capName, imageSrc);

      if (!result.changedName){
        return sendJson(res, 422, {
          ok: false,
          error: "No se encontró cap-name en index.html."
        });
      }

      if (imageSrc && !result.changedImage){
        return sendJson(res, 422, {
          ok: false,
          error: "No se encontró cap-photo-img-clean en index.html."
        });
      }

      await githubPutContent(
        env,
        indexPath,
        result.html,
        "admin: update cap " + brand + "/" + cap
      );

      return sendJson(res, 200, {
        ok: true,
        brand,
        cap,
        name: capName,
        publicUrl: "/" + brand + "/caps/" + cap + "/",
        imageUrl: imageSrc
      });
    }

    return sendJson(res, 405, {
      ok: false,
      error: "Método no permitido."
    });

  } catch (e){
    const status = e && e.statusCode ? e.statusCode : 500;

    let message = e && e.message ? e.message : "Error interno.";

    if (status === 500 && message === "Error interno."){
      message = "Error interno en la API.";
    }

    return sendJson(res, status, {
      ok: false,
      error: message
    });
  }
};