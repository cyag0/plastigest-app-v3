#!/usr/bin/env node
/**
 * Genera las capturas de la ayuda (assets/help/<tema>/<nombre>.webp) y el
 * registro help/images.ts que las enlaza con sus dimensiones.
 *
 *   npm run help:screenshots                            # todos los temas
 *   npm run help:screenshots -- transferencias          # un tema
 *   npm run help:screenshots -- transferencias/aprobar  # solo esa captura (el
 *                                                       # recorrido del tema corre completo)
 *   npm run help:screenshots -- --skip-build            # reusa el último build web
 *
 * Necesita el backend local corriendo (EXPO_PUBLIC_API_URL de .env) con los
 * datos demo (DemoDataSeeder) y Chromium de Playwright
 * (`npx playwright install chromium`).
 *
 * Por defecto exporta la app web en modo producción a .expo/help-web y la sirve
 * en un puerto local, así no salen los avisos de desarrollo. Con HELP_BASE_URL
 * usa una app ya levantada (útil para iterar en un recorrido).
 *
 * Los recorridos de cada tema viven en ./shots.mjs.
 */

import { Buffer } from "node:buffer";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { topics, USERS } from "./shots.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ASSETS_DIR = path.join(ROOT, "assets/help");
const REGISTRY = path.join(ROOT, "help/images.ts");
const WEB_DIR = path.join(ROOT, ".expo/help-web");
const PASSWORD = process.env.HELP_PASSWORD ?? "Demo2026$";

const args = process.argv.slice(2);
const skipBuild = args.includes("--skip-build");
const filters = args.filter((arg) => !arg.startsWith("--"));

const VARIANTS = {
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 },
};

function readEnv(name) {
  const env = fs.readFileSync(path.join(ROOT, ".env"), "utf8");
  return env.match(new RegExp(`^${name}=(.*)$`, "m"))?.[1]?.trim();
}

const API_URL = process.env.HELP_API_URL ?? readEnv("EXPO_PUBLIC_API_URL") ?? "http://localhost:8002/api";

// --- App web --------------------------------------------------------------

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml",
  ".ico": "image/x-icon", ".ttf": "font/ttf", ".woff": "font/woff", ".woff2": "font/woff2",
};

/** Sirve el export (output "single"): cualquier ruta que no es archivo da index.html. */
function serve(dir) {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let file = path.join(dir, urlPath);
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      file = path.join(dir, "index.html");
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] ?? "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve({ server, url: `http://localhost:${server.address().port}` }));
  });
}

async function startApp() {
  if (process.env.HELP_BASE_URL) return { url: process.env.HELP_BASE_URL, close: () => {} };

  if (!skipBuild || !fs.existsSync(path.join(WEB_DIR, "index.html"))) {
    console.log("› Exportando la app web (producción)…");
    const result = spawnSync("npx", ["expo", "export", "--platform", "web", "--output-dir", WEB_DIR], {
      cwd: ROOT,
      stdio: "inherit",
      env: { ...process.env, CI: "1" },
    });
    if (result.status !== 0) throw new Error("Falló expo export");
  }

  const { server, url } = await serve(WEB_DIR);
  return { url, close: () => server.close() };
}

// --- Sesiones ---------------------------------------------------------------

const states = new Map();

async function login(browser, baseUrl, userKey) {
  if (states.has(userKey)) return states.get(userKey);

  const context = await browser.newContext(VARIANTS.mobile);
  const page = await context.newPage();
  await page.goto(`${baseUrl}/login`);
  const inputs = page.locator("input");
  await inputs.first().waitFor({ timeout: 120_000 });
  await inputs.nth(0).fill(USERS[userKey].email);
  await inputs.nth(1).fill(PASSWORD);
  await page.keyboard.press("Enter");
  await page.waitForURL((url) => !url.pathname.includes("login"), { timeout: 30_000 });
  await page.waitForFunction(() => localStorage.getItem("selected_location"));

  const state = await context.storageState();
  await context.close();
  states.set(userKey, state);
  return state;
}

function storageOf(state) {
  return Object.fromEntries(state.origins.flatMap((o) => o.localStorage).map((i) => [i.name, i.value]));
}

/** Cliente del API con la sesión del usuario (token, empresa y sucursal). */
function apiClient(state) {
  const storage = storageOf(state);
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${storage.auth_token}`,
    "X-Company-ID": String(JSON.parse(storage.selected_company).id),
    "X-Location-ID": String(JSON.parse(storage.selected_location).id),
  };

  const call = async (method, url, body) => {
    const isForm = body instanceof FormData;
    const res = await fetch(`${API_URL}${url}`, {
      method,
      headers: body && !isForm ? { ...headers, "Content-Type": "application/json" } : headers,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(`${method} ${url} → ${res.status} ${json?.message ?? ""}`);
    return json;
  };

  return {
    /** Sucursal en la que entra el usuario: { id, name, … }. */
    location: JSON.parse(storage.selected_location),
    get: (url) => call("GET", url),
    post: (url, body) => call("POST", url, body),
    delete: (url) => call("DELETE", url),
  };
}

// --- Capturas ---------------------------------------------------------------

/** Recuadro (y número, si hay varios) sobre los elementos a señalar. */
async function annotate(page, rawMarks) {
  if (rawMarks.length === 0) return;

  // Una marca es un Locator o { locator, label }; un Locator también tiene
  // un método `locator`, por eso se distingue por tipo.
  const marks = rawMarks.map((mark) => (typeof mark.locator === "function" ? { locator: mark } : mark));

  await marks[0].locator.first().evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(300);

  const boxes = [];
  for (const [index, mark] of marks.entries()) {
    const box = await mark.locator.first().boundingBox();
    if (!box) {
      console.warn(`  ! sin recuadro para la marca ${index + 1} (no está visible)`);
      continue;
    }
    boxes.push({ ...box, label: mark.label ?? (marks.length > 1 ? String(index + 1) : null) });
  }

  await page.evaluate((boxes) => {
    // El recuadro se recorta a la pantalla para que no se pierda en el borde.
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    for (const box of boxes) {
      const left = Math.max(3, box.x - 5);
      const top = Math.max(3, box.y - 5);
      const right = Math.min(vw - 3, box.x + box.width + 5);
      const bottom = Math.min(vh - 3, box.y + box.height + 5);
      const mark = document.createElement("div");
      mark.className = "help-shot-mark";
      Object.assign(mark.style, {
        position: "fixed",
        left: `${left}px`,
        top: `${top}px`,
        width: `${right - left}px`,
        height: `${bottom - top}px`,
        border: "3px solid #F59E0B",
        borderRadius: "10px",
        boxShadow: "0 0 0 4px rgba(245, 158, 11, 0.25)",
        zIndex: "2147483647",
        pointerEvents: "none",
        boxSizing: "border-box",
      });
      if (box.label) {
        const badge = document.createElement("div");
        badge.textContent = box.label;
        Object.assign(badge.style, {
          position: "absolute",
          // Pegado a la esquina por fuera, o por dentro si no hay espacio.
          top: top >= 16 ? "-13px" : "4px",
          left: left >= 16 ? "-13px" : "4px",
          width: "24px",
          height: "24px",
          borderRadius: "12px",
          background: "#F59E0B",
          color: "#FFFFFF",
          font: "700 13px/24px system-ui, sans-serif",
          textAlign: "center",
        });
        mark.appendChild(badge);
      }
      document.body.appendChild(mark);
    }
  }, boxes);
}

/** PNG → WebP con el codificador de Chromium (no hace falta sharp ni cwebp). */
async function toWebp(converter, png) {
  const base64 = await converter.evaluate(async (data) => {
    const img = new Image();
    img.src = `data:image/png;base64,${data}`;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext("2d").drawImage(img, 0, 0);
    return canvas.toDataURL("image/webp", 0.82).split(",")[1];
  }, png.toString("base64"));
  return Buffer.from(base64, "base64");
}

function webpSize(buffer) {
  const chunk = buffer.toString("ascii", 12, 16);
  if (chunk === "VP8 ") {
    return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === "VP8L") {
    const bits = buffer.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X") {
    return { width: buffer.readUIntLE(24, 3) + 1, height: buffer.readUIntLE(27, 3) + 1 };
  }
  throw new Error("WebP no reconocido");
}

/** Reescribe help/images.ts con todas las capturas que hay en assets/help. */
function writeRegistry() {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
  const entries = fs
    .readdirSync(ASSETS_DIR, { recursive: true })
    .filter((file) => file.endsWith(".webp"))
    .map((file) => file.split(path.sep).join("/"))
    .sort();

  const lines = entries.map((file) => {
    const { width, height } = webpSize(fs.readFileSync(path.join(ASSETS_DIR, file)));
    const key = file.replace(/\.webp$/, "");
    return `  "${key}": { source: require("../assets/help/${file}"), width: ${width}, height: ${height} },`;
  });

  fs.writeFileSync(
    REGISTRY,
    `// Generado por scripts/help-screenshots/run.mjs. No editar a mano: se
// reescribe al regenerar las capturas (npm run help:screenshots).

export interface HelpImage {
  source: number;
  width: number;
  height: number;
}

export const helpImages = {
${lines.join("\n")}
} satisfies Record<string, HelpImage>;

export type HelpImageKey = keyof typeof helpImages;
`,
  );
  console.log(`› help/images.ts: ${entries.length} imágenes`);
}

// --- Main -------------------------------------------------------------------

const wanted = (topicId, name) =>
  filters.length === 0 || filters.some((f) => f === topicId || f === `${topicId}/${name}`);

const selected = topics.filter((topic) => wanted(topic.id) || filters.some((f) => f.startsWith(`${topic.id}/`)));
if (selected.length === 0) {
  console.error(`No hay temas que coincidan con: ${filters.join(", ")}`);
  process.exit(1);
}

const app = await startApp();
const browser = await chromium.launch();
const converter = await (await browser.newContext()).newPage();
let failed = false;

try {
  for (const topic of selected) {
    console.log(`› ${topic.id}`);
    const contexts = [];

    const helpers = {
      baseUrl: app.url,
      /** Página con la sesión de `userKey` (ver USERS en shots.mjs). */
      async page(userKey, variant = "mobile") {
        const state = await login(browser, app.url, userKey);
        const context = await browser.newContext({
          ...VARIANTS[variant],
          storageState: state,
          locale: "es-MX",
          timezoneId: "America/Mexico_City",
        });
        contexts.push(context);
        return context.newPage();
      },
      async api(userKey) {
        return apiClient(await login(browser, app.url, userKey));
      },
      async goto(page, route) {
        await page.goto(`${app.url}${route}`);
        await page.waitForLoadState("networkidle").catch(() => {});
      },
      /** Con HELP_DEBUG_DIR, guarda la pantalla tal cual para revisar un recorrido. */
      async debug(page, name) {
        if (!process.env.HELP_DEBUG_DIR) return;
        await page.screenshot({ path: path.join(process.env.HELP_DEBUG_DIR, `${topic.id}-${name}.png`) });
      },
      /** Guarda la captura `name` señalando `marks` (locators o { locator, label }). */
      async shot(name, page, { marks = [] } = {}) {
        if (!wanted(topic.id, name)) return;
        await page.waitForTimeout(500);
        await annotate(page, marks);
        const png = await page.screenshot({ animations: "disabled" });
        await page.evaluate(() => document.querySelectorAll(".help-shot-mark").forEach((el) => el.remove()));

        const file = path.join(ASSETS_DIR, topic.id, `${name}.webp`);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        const webp = await toWebp(converter, png);
        fs.writeFileSync(file, webp);
        console.log(`  ✓ ${topic.id}/${name} (${Math.round(webp.length / 1024)} KB)`);
      },
    };

    try {
      await topic.run(helpers);
    } catch (error) {
      failed = true;
      console.error(`  ✗ ${topic.id}: ${error.message}`);
    } finally {
      await Promise.all(contexts.map((context) => context.close()));
    }
  }

  writeRegistry();
} finally {
  await browser.close();
  app.close();
}

process.exit(failed ? 1 : 0);
