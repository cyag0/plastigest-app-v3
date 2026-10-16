/**
 * Modo kiosko: estado del equipo, no de la sesión.
 *
 * Con el modo activo la app queda fija en /kiosk (ver
 * components/Kiosk/KioskModeGate) hasta que alguien del personal sale con el
 * PIN. Se guarda en AsyncStorage aparte de la sesión, así que sobrevive a
 * recargar la página, reabrir la app o volver a iniciar sesión (logout y un
 * 401 no lo borran: clearSessionStorage solo quita las llaves de la sesión).
 *
 * Aplica solo al usuario y a la sucursal con que se inició: si en el equipo
 * entra otra cuenta, o la misma en otra sucursal, la app se usa normal.
 *
 * El PIN se guarda como SHA-256 de "sal:PIN" (WebCrypto si existe; si no, la
 * misma función en JS, porque Hermes no trae WebCrypto). La seguridad que se
 * busca es baja: que un cliente no salga del kiosko.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { newClientRequestId } from "./requestId";

const STORAGE_KEY = "@plastigest/kiosk.mode";
const LOCK_STORAGE_KEY = "@plastigest/kiosk.pinLock";

/** Intentos fallidos antes de esperar. */
export const KIOSK_PIN_MAX_ATTEMPTS = 5;
/** Espera tras los intentos fallidos. */
export const KIOSK_PIN_LOCK_MS = 30 * 1000;
export const KIOSK_PIN_MIN_LENGTH = 4;
export const KIOSK_PIN_MAX_LENGTH = 6;

export interface KioskModeRecord {
  enabled: boolean;
  pinHash: string;
  salt: string;
  userId: number;
  locationId: number;
  startedAt: string;
}

export interface KioskSession {
  userId: number;
  locationId: number;
}

export type KioskPinResult =
  | { ok: true }
  | { ok: false; reason: "wrong"; attemptsLeft: number }
  | { ok: false; reason: "locked"; lockedUntil: number }
  | { ok: false; reason: "inactive" };

interface PinLock {
  failures: number;
  lockedUntil: number;
}

// ─── Caché síncrono ─────────────────────────────────────────────────────────

/** undefined = todavía no se lee del almacenamiento; null = sin modo kiosko. */
let cached: KioskModeRecord | null | undefined;
let loadPromise: Promise<KioskModeRecord | null> | null = null;
/** Usuario y sucursal de la sesión actual (lo informa KioskModeGate). */
let session: KioskSession | null = null;
let pinLock: PinLock = { failures: 0, lockedUntil: 0 };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.warn("kioskMode listener:", error);
    }
  });
}

function parseRecord(raw: string | null): KioskModeRecord | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (
      !data ||
      data.enabled !== true ||
      typeof data.pinHash !== "string" ||
      typeof data.salt !== "string" ||
      !Number.isFinite(Number(data.userId)) ||
      !Number.isFinite(Number(data.locationId))
    ) {
      return null;
    }
    return {
      enabled: true,
      pinHash: data.pinHash,
      salt: data.salt,
      userId: Number(data.userId),
      locationId: Number(data.locationId),
      startedAt: typeof data.startedAt === "string" ? data.startedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function parseLock(raw: string | null): PinLock {
  try {
    const data = raw ? JSON.parse(raw) : null;
    return {
      failures: Math.max(0, Number(data?.failures) || 0),
      lockedUntil: Math.max(0, Number(data?.lockedUntil) || 0),
    };
  } catch {
    return { failures: 0, lockedUntil: 0 };
  }
}

/** Lee el modo guardado una vez (las siguientes llamadas usan el caché). */
export function loadKioskMode(): Promise<KioskModeRecord | null> {
  if (cached !== undefined) return Promise.resolve(cached);
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const [raw, lockRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(LOCK_STORAGE_KEY),
        ]);
        // Un start/stop que terminó mientras se leía manda.
        if (cached === undefined) cached = parseRecord(raw);
        pinLock = parseLock(lockRaw);
      } catch (error) {
        console.warn("No se pudo leer el modo kiosko:", error);
        if (cached === undefined) cached = null;
      } finally {
        loadPromise = null;
      }
      emit();
      return cached ?? null;
    })();
  }
  return loadPromise;
}

// Se empieza a leer al cargar el módulo (lo importa el layout raíz): cuando la
// sesión termina de cargar, el caché ya está listo y no hay parpadeo.
void loadKioskMode();

/** Modo guardado (lee el almacenamiento la primera vez). */
export function getKioskMode(): Promise<KioskModeRecord | null> {
  return loadKioskMode();
}

/** El modo en memoria: undefined si todavía no se lee. */
export function getCachedKioskMode(): KioskModeRecord | null | undefined {
  return cached;
}

/** ¿El modo aplica a este usuario y sucursal? */
export function isKioskModeFor(
  record: KioskModeRecord | null | undefined,
  userId: number | null | undefined,
  locationId: number | null | undefined,
): boolean {
  return (
    !!record?.enabled &&
    userId != null &&
    locationId != null &&
    record.userId === Number(userId) &&
    record.locationId === Number(locationId)
  );
}

/**
 * Para usos fuera de React (avisos push): ¿el equipo está en modo kiosko? Si
 * la sesión ya se conoce, solo cuando es la del kiosko.
 */
export function isKioskModeActive(): boolean {
  if (!cached?.enabled) return false;
  if (!session) return true;
  return isKioskModeFor(cached, session.userId, session.locationId);
}

/** KioskModeGate informa el usuario y la sucursal actuales (null sin sesión). */
export function setKioskSession(next: KioskSession | null): void {
  const same =
    (next === null && session === null) ||
    (next !== null && session !== null && next.userId === session.userId && next.locationId === session.locationId);
  if (same) return;
  session = next ? { userId: Number(next.userId), locationId: Number(next.locationId) } : null;
  emit();
}

/** Avisa cada cambio del modo (o de la sesión). Devuelve la baja. */
export function subscribeKioskMode(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// ─── PIN ────────────────────────────────────────────────────────────────────

export function isValidKioskPin(pin: string): boolean {
  return new RegExp(`^\\d{${KIOSK_PIN_MIN_LENGTH},${KIOSK_PIN_MAX_LENGTH}}$`).test(pin);
}

/** Inicia el modo kiosko con este PIN para el usuario y la sucursal dados. */
export async function startKioskMode(pin: string, owner?: KioskSession): Promise<KioskModeRecord> {
  if (!isValidKioskPin(pin)) {
    throw new Error(`El PIN debe tener de ${KIOSK_PIN_MIN_LENGTH} a ${KIOSK_PIN_MAX_LENGTH} dígitos.`);
  }
  const who = owner ?? session;
  if (!who) throw new Error("No hay sesión para iniciar el modo kiosko.");

  const salt = newClientRequestId().replace(/-/g, "");
  const record: KioskModeRecord = {
    enabled: true,
    pinHash: await sha256Hex(`${salt}:${pin}`),
    salt,
    userId: Number(who.userId),
    locationId: Number(who.locationId),
    startedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  cached = record;
  pinLock = { failures: 0, lockedUntil: 0 };
  AsyncStorage.removeItem(LOCK_STORAGE_KEY).catch(() => undefined);
  emit();
  return record;
}

/** Espera por intentos fallidos (0 si no hay). */
export function kioskPinLockedUntil(): number {
  return pinLock.lockedUntil > Date.now() ? pinLock.lockedUntil : 0;
}

function savePinLock() {
  AsyncStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify(pinLock)).catch(() => undefined);
}

/**
 * Revisa el PIN para salir. Tras 5 intentos fallidos hay que esperar 30 s
 * (la espera se guarda: recargar la página no la quita).
 */
export async function verifyKioskPin(pin: string): Promise<KioskPinResult> {
  const record = await loadKioskMode();
  if (!record?.enabled) return { ok: false, reason: "inactive" };

  const lockedUntil = kioskPinLockedUntil();
  if (lockedUntil) return { ok: false, reason: "locked", lockedUntil };

  const hash = await sha256Hex(`${record.salt}:${pin}`);
  if (hash === record.pinHash) {
    pinLock = { failures: 0, lockedUntil: 0 };
    AsyncStorage.removeItem(LOCK_STORAGE_KEY).catch(() => undefined);
    return { ok: true };
  }

  const failures = pinLock.failures + 1;
  if (failures >= KIOSK_PIN_MAX_ATTEMPTS) {
    pinLock = { failures: 0, lockedUntil: Date.now() + KIOSK_PIN_LOCK_MS };
    savePinLock();
    return { ok: false, reason: "locked", lockedUntil: pinLock.lockedUntil };
  }
  pinLock = { failures, lockedUntil: 0 };
  savePinLock();
  return { ok: false, reason: "wrong", attemptsLeft: KIOSK_PIN_MAX_ATTEMPTS - failures };
}

/** Quita el modo kiosko del equipo. */
export async function stopKioskMode(): Promise<void> {
  cached = null;
  pinLock = { failures: 0, lockedUntil: 0 };
  emit();
  await Promise.all([
    AsyncStorage.removeItem(STORAGE_KEY),
    AsyncStorage.removeItem(LOCK_STORAGE_KEY),
  ]).catch((error) => {
    console.warn("No se pudo quitar el modo kiosko:", error);
  });
}

// ─── Pantalla completa (web) ────────────────────────────────────────────────

/**
 * Pide pantalla completa en web. Debe llamarse dentro del toque (el navegador
 * la niega fuera de un gesto del usuario). En el teléfono no hace nada.
 */
export function requestKioskFullscreen(): void {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  const doc = document as Document & { webkitFullscreenElement?: Element | null };
  if (doc.fullscreenElement || doc.webkitFullscreenElement) return;
  const element = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => void;
  };
  try {
    if (typeof element.requestFullscreen === "function") {
      element.requestFullscreen({ navigationUI: "hide" }).catch(() => undefined);
    } else {
      element.webkitRequestFullscreen?.();
    }
  } catch {
    // Sin permiso o sin soporte: el kiosko funciona igual.
  }
}

/** Sale de la pantalla completa en web (al salir del modo kiosko). */
export function exitKioskFullscreen(): void {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  try {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
  } catch {
    // nada que hacer
  }
}

// ─── SHA-256 ────────────────────────────────────────────────────────────────

function utf8Bytes(text: string): Uint8Array<ArrayBuffer> {
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) {
    let code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
        i++;
      }
    }
    if (code < 0x80) {
      out.push(code);
    } else if (code < 0x800) {
      out.push(0xc0 | (code >> 6), 0x80 | (code & 63));
    } else if (code < 0x10000) {
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
    } else {
      out.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 63), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
    }
  }
  return Uint8Array.from(out);
}

function toHex(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
  return hex;
}

const K256 = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

/** SHA-256 en JS (FIPS 180-4), para cuando no hay WebCrypto. */
export function sha256HexSync(text: string): string {
  const bytes = utf8Bytes(text);
  const bitLength = bytes.length * 8;
  const padded = new Uint8Array((((bytes.length + 9 + 63) >> 6) << 6));
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(padded.length - 4, bitLength >>> 0);

  const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const w = new Array<number>(64);

  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + s1 + ch + K256[i] + w[i]) >>> 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (s0 + maj) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    h[0] = (h[0] + a) >>> 0;
    h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0;
    h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0;
    h[5] = (h[5] + f) >>> 0;
    h[6] = (h[6] + g) >>> 0;
    h[7] = (h[7] + hh) >>> 0;
  }

  return h.map((word) => word.toString(16).padStart(8, "0")).join("");
}

/** SHA-256 en hexadecimal: WebCrypto si está (web con HTTPS), si no en JS. */
export async function sha256Hex(text: string): Promise<string> {
  const subtle = (globalThis as { crypto?: Crypto }).crypto?.subtle;
  if (subtle && typeof subtle.digest === "function") {
    try {
      const digest = await subtle.digest("SHA-256", utf8Bytes(text));
      return toHex(new Uint8Array(digest));
    } catch {
      // Sigue con la versión en JS (mismo resultado).
    }
  }
  return sha256HexSync(text);
}
