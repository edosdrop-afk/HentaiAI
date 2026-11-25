// HentaiAI starter server. Node.js 20+, no third-party dependencies.
// Keeps API keys on the server. Never put provider keys in public/app.js.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const DATA = path.join(ROOT, "data");
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const AI_API_URL = process.env.AI_API_URL || "";
const AI_API_KEY = process.env.AI_API_KEY || "";
const AI_MODEL = process.env.AI_MODEL || "";

fs.mkdirSync(DATA, { recursive: true });
const dbFile = path.join(DATA, "store.json");
if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, JSON.stringify({ characters: [], gallery: [], chats: [] }, null, 2));

function readDB() { try { return JSON.parse(fs.readFileSync(dbFile, "utf8")); } catch { return { characters: [], gallery: [], chats: [] }; } }
function writeDB(db) { fs.writeFileSync(dbFile, JSON.stringify(db, null, 2)); }
function send(res, status, body, type="application/json; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type, "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin" });
  res.end(type.startsWith("application/json") ? JSON.stringify(body) : body);
}
function body(req) {
  return new Promise((resolve, reject) => {
    let raw = ""; req.on("data", c => { raw += c; if (raw.length > 1_000_000) reject(new Error("Request too large")); });
    req.on("end", () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error("Invalid JSON")); } });
  });
}
function clean(s, max=4000) { return String(s || "").trim().slice(0, max); }
function adultSafe(text) {
  const t = text.toLowerCase();
  // Basic guardrail, not a substitute for provider moderation.
  return !/(underage|minor|child|kid|loli|shota|школьниц|несовершеннолет|реб[её]нок|малолет)/i.test(t);
}
async function askAI(messages, system) {
  if (!AI_API_URL || !AI_API_KEY || !AI_MODEL) {
    return { demo: true, reply: "Сервер HentaiAI запущен, но языковая модель ещё не подключена. Владелец должен задать AI_API_URL, AI_API_KEY и AI_MODEL в переменных окружения." };
  }
  const response = await fetch(AI_API_URL, {
    method: "POST",
    headers: { "Authorization": `Bearer ${AI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: AI_MODEL, messages: [{ role: "system", content: system }, ...messages] })
  });
  if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
  const data = await response.json();
  return { demo: false, reply: data.choices?.[0]?.message?.content || "Модель не вернула текст." };
}
const mime = { ".html":"text/html; charset=utf-8", ".css":"text/css; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".svg":"image/svg+xml", ".png":"image/png", ".jpg":"image/jpeg", ".webp":"image/webp" };

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (req.method === "GET" && url.pathname === "/api/status") {
      return send(res, 200, { ok: true, aiConfigured: !!(AI_API_URL && AI_API_KEY && AI_MODEL) });
    }
    if (req.method === "GET" && url.pathname === "/api/characters") {
      return send(res, 200, readDB().characters);
    }
    if (req.method === "POST" && url.pathname === "/api/characters") {
      const b = await body(req), name = clean(b.name, 60), description = clean(b.description, 1500);
      if (!name || !description) return send(res, 400, { error: "Нужны имя и описание." });
      if (!adultSafe(name + " " + description)) return send(res, 400, { error: "Персонажи должны быть явно совершеннолетними." });
      const db = readDB(), item = { id: Date.now().toString(36), name, description, createdAt: new Date().toISOString() };
      db.characters.unshift(item); writeDB(db); return send(res, 201, item);
    }
    if (req.method === "GET" && url.pathname === "/api/gallery") return send(res, 200, readDB().gallery);
    if (req.method === "POST" && url.pathname === "/api/chat") {
      const b = await body(req), message = clean(b.message, 3000), character = clean(b.character, 100);
      if (!message) return send(res, 400, { error: "Напиши сообщение." });
      if (!adultSafe(message + " " + character)) return send(res, 400, { error: "Сценарии с несовершеннолетними персонажами запрещены." });
      const result = await askAI([{ role: "user", content: `Персонаж: ${character || "Мия"}\nСообщение пользователя: ${message}` }],
        "Ты дружелюбный ролевой ИИ-персонаж HentaiAI. Все персонажи однозначно совершеннолетние. Не создавай сексуальный контент с несовершеннолетними или персонажами, выглядящими несовершеннолетними. Отвечай на русском.");
      return send(res, 200, result);
    }
    if (req.method === "POST" && url.pathname === "/api/image-prompt") {
      const b = await body(req), prompt = clean(b.prompt, 2000), style = clean(b.style, 100);
      if (!prompt) return send(res, 400, { error: "Добавь описание изображения." });
      if (!adultSafe(prompt)) return send(res, 400, { error: "Запрос должен описывать только совершеннолетних персонажей." });
      return send(res, 200, { prompt: `${prompt}. Style: ${style || "anime illustration"}. All depicted characters are clearly adults.` });
    }
    if (req.method !== "GET" && req.method !== "HEAD") return send(res, 404, { error: "Not found" });
    let file = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
    const resolved = path.resolve(PUBLIC, "." + file);
    if (!resolved.startsWith(PUBLIC + path.sep)) return send(res, 403, { error: "Forbidden" });
    fs.readFile(resolved, (err, content) => {
      if (err) return send(res, 404, "Not found", "text/plain; charset=utf-8");
      send(res, 200, content, mime[path.extname(resolved)] || "application/octet-stream");
    });
  } catch (e) { send(res, 500, { error: e.message || "Server error" }); }
});
server.listen(PORT, HOST, () => console.log(`HentaiAI running at http://${HOST}:${PORT}`));
