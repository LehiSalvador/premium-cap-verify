// api/admin-caps.js
// Vercel serverless. CommonJS. Node 18+ (fetch global).

const ALLOWED_BRANDS = [
  { id: "barbas-hats",     label: "Barbas Hats" },
  { id: "dandy-hats",      label: "Dandy Hats" },
  { id: "rude-awakenings", label: "Rude Awakenings" },
  { id: "31-hats",         label: "31 Hats" },
  { id: "gallo-fino",      label: "Gallo Fino" },
  { id: "jc-hats",         label: "JC Hats" },
  { id: "baez",            label: "Baez" }
];

const IMAGE_EXT_BY_MIME = {
  "image/webp": "webp",
  "image/png":  "png",
  "image/jpeg": "jpg",
  "image/jpg":  "jpg"
};
const ALLOWED_IMAGE_EXTS = ["webp","png","jpg","jpeg"];

function sendJson(res, status, payload){
  res.statusCode = status;
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Cache-Control","no-store");
  res.end(JSON.stringify(payload));
}

function requireEnv(){
  const owner  = process.env.GITHUB_OWNER;
  const repo   = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  const token  = process.env.GITHUB_TOKEN;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const missing = [];
  if (!owner)          missing.push("GITHUB_OWNER");
  if (!repo)           missing.push("GITHUB_REPO");
  if (!token)          missing.push("GITHUB_TOKEN");
  if (!adminPassword)  missing.push("ADMIN_PASSWORD");
  if (missing.length){
    const e = new Error("Missing env: " + missing.join(", "));
    e.statusCode = 500;
    throw e;
  }
  return { owner, repo, branch, token, adminPassword };
}

function validatePassword(req, env){
  const provided = (req.headers && req.headers["x-admin-password"]) || "";
  if (!provided || provided !== env.adminPassword){
    const e = new Error("Unauthorized");
    e.statusCode = 401;
    throw e;
  }
}

function validateBrand(brand){
  const found = ALLOWED_BRANDS.find(b => b.id === brand);
  if (!found){
    const e = new Error("Invalid brand");
    e.statusCode = 400;
    throw e;
  }
  return found;
}

function normalizeCap(value){
  if (typeof value !== "string" || !/^\d{1,4}$/.test(value)){
    const e = new Error("Invalid cap");
    e.statusCode = 400;
    throw e;
  }
  return value.padStart(3, "0");
}

function escapeHtml(value){
  return String(value == null ? "" : value)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;");
}

function readJsonBody(req){
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];
    const MAX = 6 * 1024 * 1024;
    req.on("data", chunk => {
      total += chunk.length;
      if (total > MAX){
        const e = new Error("Payload too large");
        e.statusCode = 413;
        reject(e);
        try { req.destroy(); } catch(_) {}
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        if (!raw){ resolve({}); return; }
        resolve(JSON.parse(raw));
      } catch (err){
        const e = new Error("Invalid JSON");
        e.statusCode = 400;
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function decodeDataUrlImage(dataUrl){
  if (typeof dataUrl !== "string") return null;
  const m = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!m) return null;
  const mime = m[1].toLowerCase();
  const ext = IMAGE_EXT_BY_MIME[mime];
  if (!ext) return null;
  let buf;
  try { buf = Buffer.from(m[2], "base64"); } catch (_) { return null; }
  if (!buf || buf.length === 0) return null;
  if (buf.length > 5 * 1024 * 1024) return null;
  return { mime, ext, buffer: buf };
}

async function githubRequest(env, path, options){
  const url = "https://api.github.com" + path;
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
  try { json = text ? JSON.parse(text) : null; } catch (_) { json = null; }
  return { status: resp.status, ok: resp.ok, json, text };
}

function encodeRepoPath(p){
  return p.split("/").map(encodeURIComponent).join("/");
}

async function githubGetContent(env, repoPath){
  const url = "/repos/" + env.owner + "/" + env.repo + "/contents/" + encodeRepoPath(repoPath) + "?ref=" + encodeURIComponent(env.branch);
  const r = await githubRequest(env, url, { method: "GET" });
  if (r.status === 404) return null;
  if (!r.ok){
    const e = new Error("GitHub get failed: " + r.status);
    e.statusCode = 502;
    throw e;
  }
  return r.json;
}

async function githubListDir(env, repoPath){
  const url = "/repos/" + env.owner + "/" + env.repo + "/contents/" + encodeRepoPath(repoPath) + "?ref=" + encodeURIComponent(env.branch);
  const r = await githubRequest(env, url, { method: "GET" });
  if (r.status === 404) return [];
  if (!r.ok){
    const e = new Error("GitHub list failed: " + r.status);
    e.statusCode = 502;
    throw e;
  }
  return Array.isArray(r.json) ? r.json : [];
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
  if (existing && existing.sha) body.sha = existing.sha;
  const url = "/repos/" + env.owner + "/" + env.repo + "/contents/" + encodeRepoPath(repoPath);
  const r = await githubRequest(env, url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!r.ok){
    const e = new Error("GitHub put failed: " + r.status);
    e.statusCode = 502;
    throw e;
  }
  return r.json;
}

async function findExistingImage(env, brand, cap){
  const dirPath = brand + "/caps/" + cap;
  const items = await githubListDir(env, dirPath);
  if (!items.length) return null;
  // Preferir exact match cap.ext
  for (const item of items){
    if (item.type !== "file") continue;
    const lower = (item.name || "").toLowerCase();
    if (lower === cap + ".webp" || lower === cap + ".png" || lower === cap + ".jpg" || lower === cap + ".jpeg"){
      return { name: item.name, path: dirPath + "/" + item.name };
    }
  }
  // Fallback: cualquier imagen
  for (const item of items){
    if (item.type !== "file") continue;
    const name = item.name || "";
    const idx = name.lastIndexOf(".");
    if (idx < 0) continue;
    const ext = name.slice(idx + 1).toLowerCase();
    if (ALLOWED_IMAGE_EXTS.indexOf(ext) >= 0){
      return { name: name, path: dirPath + "/" + name };
    }
  }
  return null;
}

async function getCapName(env, brand, cap){
  const path = brand + "/caps/" + cap + "/name.txt";
  const item = await githubGetContent(env, path);
  if (!item || !item.content) return "";
  return Buffer.from(item.content, "base64").toString("utf8").trim();
}

async function getCapInfo(env, brand, cap){
  const dir = brand + "/caps/" + cap;
  const items = await githubListDir(env, dir);
  if (!items.length) return null;
  const hasIndex = items.some(i => i.type === "file" && i.name === "index.html");
  if (!hasIndex) return null;
  const name = await getCapName(env, brand, cap).catch(() => "");
  const img = await findExistingImage(env, brand, cap);
  const cb = Date.now();
  return {
    cap: cap,
    name: name || "",
    publicUrl: "/" + brand + "/caps/" + cap + "/",
    imageUrl: img ? "/" + img.path + "?v=" + cb : null,
    imagePath: img ? img.path : null
  };
}

function updateIndexHtml(html, capName, imagePublicSrc){
  let updated = html;
  let changedName = false;
  let changedImg = false;

  // Cambiar SOLO contenido de <p class="...cap-name...">...</p>
  const reCapName = /(<p[^>]*class=["'][^"']*\bcap-name\b[^"']*["'][^>]*>)([\s\S]*?)(<\/p>)/i;
  if (reCapName.test(updated)){
    updated = updated.replace(reCapName, function(_full, open, _inner, close){
      changedName = true;
      return open + escapeHtml(capName) + close;
    });
  }

  if (imagePublicSrc){
    // Buscar etiqueta img que contenga la clase cap-photo-img-clean
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
      changedImg = true;
    }
  } else {
    changedImg = true; // no se pidio cambio de imagen
  }

  return { html: updated, changedName, changedImg };
}

module.exports = async function handler(req, res){
  try {
    const env = requireEnv();
    const method = req.method || "GET";
    const url = new URL(req.url, "http://x");
    const action = url.searchParams.get("action") || "";

    if (method === "GET"){
      if (action === "list"){
        validatePassword(req, env);
        return sendJson(res, 200, { ok: true, brands: ALLOWED_BRANDS });
      }
      if (action === "listCaps"){
        validatePassword(req, env);
        const brand = url.searchParams.get("brand") || "";
        validateBrand(brand);
        const items = await githubListDir(env, brand + "/caps");
        const dirs = items.filter(i => i.type === "dir");
        const caps = [];
        for (const d of dirs){
          if (!/^\d+$/.test(d.name)) continue;
          const cap = d.name.padStart(3, "0");
          const info = await getCapInfo(env, brand, cap).catch(() => null);
          if (info) caps.push(info);
        }
        caps.sort((a,b) => a.cap.localeCompare(b.cap));
        return sendJson(res, 200, { ok: true, brand: brand, caps: caps });
      }
      if (action === "cap"){
        validatePassword(req, env);
        const brand = url.searchParams.get("brand") || "";
        validateBrand(brand);
        const cap = normalizeCap(url.searchParams.get("cap") || "");
        const info = await getCapInfo(env, brand, cap);
        if (!info) return sendJson(res, 404, { ok: false, error: "Cap not found" });
        return sendJson(res, 200, Object.assign({ ok: true, brand: brand }, info));
      }
      return sendJson(res, 400, { ok: false, error: "Unknown action" });
    }

    if (method === "POST"){
      validatePassword(req, env);
      const body = await readJsonBody(req);
      const brand = body.brand || "";
      validateBrand(brand);
      const cap = normalizeCap(body.cap || "");
      const capName = (body.capName || "").toString().trim();
      if (!capName || capName.length > 200){
        return sendJson(res, 400, { ok: false, error: "Invalid capName" });
      }

      const dir = brand + "/caps/" + cap;
      const items = await githubListDir(env, dir);
      if (!items.length){
        return sendJson(res, 404, { ok: false, error: "Cap directory not found" });
      }
      const indexItem = items.find(i => i.type === "file" && i.name === "index.html");
      if (!indexItem){
        return sendJson(res, 404, { ok: false, error: "index.html not found for cap" });
      }

      const cb = Date.now();
      let imagePath = null;

      if (body.imageBase64){
        const decoded = decodeDataUrlImage(body.imageBase64);
        if (!decoded){
          return sendJson(res, 400, { ok: false, error: "Invalid image data" });
        }
        const imageName = cap + "." + decoded.ext;
        imagePath = dir + "/" + imageName;
        await githubPutContent(env, imagePath, decoded.buffer, "admin: update image " + brand + "/" + cap);
      } else {
        const existing = await findExistingImage(env, brand, cap);
        if (existing) imagePath = existing.path;
      }

      // name.txt
      await githubPutContent(env, dir + "/name.txt", capName, "admin: update name " + brand + "/" + cap);

      // index.html
      const indexFile = await githubGetContent(env, dir + "/index.html");
      if (!indexFile || !indexFile.content){
        return sendJson(res, 404, { ok: false, error: "Cannot read index.html" });
      }
      const currentHtml = Buffer.from(indexFile.content, "base64").toString("utf8");
      const imageSrc = imagePath ? "/" + imagePath + "?v=" + cb : null;
      const result = updateIndexHtml(currentHtml, capName, imageSrc);
      if (!result.changedName){
        return sendJson(res, 422, { ok: false, error: "cap-name placeholder not found in index.html" });
      }
      if (imageSrc && !result.changedImg){
        return sendJson(res, 422, { ok: false, error: "cap-photo-img-clean not found in index.html" });
      }
      await githubPutContent(env, dir + "/index.html", result.html, "admin: update cap " + brand + "/" + cap);

      return sendJson(res, 200, {
        ok: true,
        brand: brand,
        cap: cap,
        name: capName,
        publicUrl: "/" + brand + "/caps/" + cap + "/",
        imageUrl: imageSrc
      });
    }

    return sendJson(res, 405, { ok: false, error: "Method not allowed" });
  } catch (e){
    const status = e && e.statusCode ? e.statusCode : 500;
    const msg = status === 500 ? "Internal error" : ((e && e.message) || "Error");
    sendJson(res, status, { ok: false, error: msg });
  }
};