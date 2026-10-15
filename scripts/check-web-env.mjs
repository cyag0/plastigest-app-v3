#!/usr/bin/env node
/**
 * Revisión previa a `npm run build:web` en Cloudflare (o cualquier CI).
 *
 * Ahí no hay .env: Expo incrusta en el bundle las variables EXPO_PUBLIC_* de
 * la compilación. Sin la dirección del API (o con una local) el despliegue
 * "sale bien" pero nadie puede iniciar sesión, así que se detiene el build con
 * un mensaje claro. En una PC de desarrollo no se revisa nada: la app misma
 * muestra la pantalla de configuración inválida (utils/appConfig.ts).
 *
 * Las variables de Firebase sólo generan un aviso: sin ellas la app funciona,
 * pero las notificaciones push del navegador quedan apagadas.
 */

const env = process.env;
const onCI = Boolean(env.CI || env.CF_PAGES || env.WORKERS_CI);

if (!onCI) process.exit(0);

// Mismo criterio que utils/appConfig.ts.
const LOCAL_HOST =
  /^(localhost|.+\.localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0|10\.0\.2\.2|10\.0\.3\.2|\[::1?\])$/i;

const apiUrl = (env.EXPO_PUBLIC_API_URL ?? "").trim();
const host = /^https?:\/\/(?:[^@/?#]*@)?(\[[^\]]*\]|[^:/?#]+)/i.exec(apiUrl)?.[1];

let problem = null;
if (!apiUrl) {
  problem = "falta EXPO_PUBLIC_API_URL (p. ej. https://api.cocos-francisco.com/api).";
} else if (!host) {
  problem = `EXPO_PUBLIC_API_URL no es una dirección válida: "${apiUrl}".`;
} else if (LOCAL_HOST.test(host) && env.EXPO_PUBLIC_ALLOW_LOCAL_API !== "true") {
  problem = `EXPO_PUBLIC_API_URL apunta a un servidor local: "${apiUrl}".`;
}

if (problem) {
  console.error(`\n✖ Build web detenido: ${problem}`);
  console.error(
    "  Defínela en las variables de compilación del proyecto (Cloudflare → Settings → Variables) y vuelve a desplegar.\n",
  );
  process.exit(1);
}

const pushKeys = [
  "EXPO_PUBLIC_FIREBASE_API_KEY",
  "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
  "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "EXPO_PUBLIC_FIREBASE_APP_ID",
  "EXPO_PUBLIC_FIREBASE_VAPID_KEY",
];
const missingPush = pushKeys.filter((key) => !(env[key] ?? "").trim());
if (missingPush.length > 0) {
  console.warn(
    `\n⚠ Faltan variables de Firebase (${missingPush.join(", ")}): las notificaciones push del navegador quedarán apagadas.\n`,
  );
}

console.log(`✓ API del build web: ${apiUrl}`);
