#!/usr/bin/env node
/**
 * Versión de la app para las tiendas (app.json → expo.version).
 *
 * El aviso "Actualiza la app" compara esa versión con MIN_NATIVE_APP_VERSION
 * del backend (GET /api/app/version). EAS sube solo el versionCode/buildNumber
 * (autoIncrement con appVersionSource "remote"), no la versión: si no se sube
 * a mano, todos los builds dicen lo mismo y el aviso no puede distinguirlos.
 *
 *   node scripts/native-release.mjs bump <patch|minor|major|x.y.z>
 *     Sube expo.version en app.json.
 *
 *   node scripts/native-release.mjs check [--eas]
 *     Revisa que expo.version sea x.y.z, mayor que la versión publicada
 *     (latest_native_version del API) y no menor que la mínima. Con --eas
 *     (hook eas-build-pre-install) sólo revisa los builds del perfil
 *     "production". Si el API no responde, avisa y sigue.
 *     SKIP_NATIVE_VERSION_CHECK=1 la salta.
 *
 * Sólo usa módulos de Node: en EAS corre antes de instalar dependencias.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const appJsonPath = join(root, "app.json");
const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

function parts(version) {
  const match = SEMVER.exec(String(version ?? "").trim());
  return match ? match.slice(1).map(Number) : null;
}

/** Negativo si a < b, 0 si son iguales, positivo si a > b. */
function compare(a, b) {
  const left = parts(a) ?? [0, 0, 0];
  const right = parts(b) ?? [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    if (left[i] !== right[i]) return left[i] - right[i];
  }
  return 0;
}

function readAppVersion() {
  const text = readFileSync(appJsonPath, "utf8");
  const version = JSON.parse(text)?.expo?.version;
  return { text, version };
}

function bump(arg) {
  const { text, version: current } = readAppVersion();
  const now = parts(current);
  if (!now) fail(`expo.version en app.json no es x.y.z: "${current}".`);

  let next;
  if (arg === "major") next = `${now[0] + 1}.0.0`;
  else if (arg === "minor") next = `${now[0]}.${now[1] + 1}.0`;
  else if (arg === "patch") next = `${now[0]}.${now[1]}.${now[2] + 1}`;
  else if (parts(arg)) next = arg.trim();
  else fail('Uso: npm run version:bump -- <patch|minor|major|x.y.z>');

  if (compare(next, current) <= 0) {
    fail(`La versión nueva (${next}) tiene que ser mayor que la actual (${current}).`);
  }

  // Sólo se cambia el texto de expo.version: el resto del archivo queda igual.
  const pattern = new RegExp(`("version"\\s*:\\s*")${current.replace(/\./g, "\\.")}(")`);
  const updated = text.replace(pattern, `$1${next}$2`);
  if (JSON.parse(updated)?.expo?.version !== next) {
    fail("No se pudo cambiar expo.version en app.json; cámbiala a mano.");
  }
  writeFileSync(appJsonPath, updated);
  console.log(`app.json: expo.version ${current} → ${next}`);
  console.log("Siguiente: commit, `eas build --profile production` y, ya publicada en las tiendas,");
  console.log(`LATEST_NATIVE_APP_VERSION=${next} en el backend (ver README, "Versiones de la app").`);
}

function apiUrl() {
  const fromEnv = (process.env.EXPO_PUBLIC_API_URL ?? "").trim();
  if (fromEnv) return fromEnv;
  try {
    const eas = JSON.parse(readFileSync(join(root, "eas.json"), "utf8"));
    return (eas?.build?.production?.env?.EXPO_PUBLIC_API_URL ?? "").trim();
  } catch {
    return "";
  }
}

async function fetchPublished(url) {
  if (typeof fetch !== "function") return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${url.replace(/\/+$/, "")}/app/version`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function check(eas) {
  if (eas && process.env.EAS_BUILD_PROFILE !== "production") return;
  if (process.env.SKIP_NATIVE_VERSION_CHECK === "1") {
    console.warn("⚠ Revisión de la versión saltada (SKIP_NATIVE_VERSION_CHECK=1).");
    return;
  }

  const { version } = readAppVersion();
  if (!parts(version)) fail(`expo.version en app.json no es x.y.z: "${version}".`);

  const url = apiUrl();
  const published = url ? await fetchPublished(url) : null;
  if (!published) {
    console.warn(
      `⚠ No se pudo consultar ${url || "el API"}/app/version: no se revisó que ${version} sea una versión nueva.`,
    );
    return;
  }

  const latest = parts(published.latest_native_version) ? published.latest_native_version : null;
  const minimum = parts(published.min_native_version) ? published.min_native_version : null;

  if (latest && compare(version, latest) <= 0) {
    fail(
      `app.json dice ${version} y en las tiendas ya está la ${latest} (LATEST_NATIVE_APP_VERSION).\n` +
        "  Sube la versión antes del build: npm run version:bump -- patch",
    );
  }
  if (minimum && compare(version, minimum) < 0) {
    fail(
      `app.json dice ${version}, menor que la mínima del servidor (${minimum}, MIN_NATIVE_APP_VERSION):\n` +
        "  este build saldría bloqueado con \"Actualiza la app\". Sube la versión.",
    );
  }
  console.log(
    `✔ Versión ${version} (publicada: ${latest ?? "sin dato"}, mínima: ${minimum ?? "sin mínima"}).`,
  );
}

const [command, arg] = process.argv.slice(2);
if (command === "bump") bump(arg);
else if (command === "check") await check(arg === "--eas");
else fail("Uso: node scripts/native-release.mjs <bump <patch|minor|major|x.y.z> | check [--eas]>");
