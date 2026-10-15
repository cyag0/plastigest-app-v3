/**
 * Llave de idempotencia (client_request_id) para ventas, pedidos y cobros: se
 * genera una por intento de cobro y se reenvía la MISMA en los reintentos
 * (red lenta, timeout, doble toque). Si la venta ya quedó registrada, el
 * servidor la reconoce y devuelve la existente en lugar de cobrar dos veces.
 * Sólo se cambia por una nueva cuando el cobro terminó bien o el carrito
 * cambió.
 *
 * Es un UUID v4 (RFC 4122, 36 caracteres). En web se usa crypto.randomUUID
 * (sólo existe en HTTPS o localhost) o crypto.getRandomValues; Hermes no trae
 * WebCrypto, así que en nativo se arma con Math.random.
 */

let fallbackCounter = 0;

function randomBytes(): Uint8Array {
  const bytes = new Uint8Array(16);
  const cryptoApi = (globalThis as { crypto?: Crypto }).crypto;

  if (typeof cryptoApi?.getRandomValues === "function") {
    try {
      cryptoApi.getRandomValues(bytes);
      return bytes;
    } catch {
      // Sigue con Math.random.
    }
  }

  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }

  // Si Math.random repitiera la secuencia (dos equipos con la misma semilla),
  // la hora y un contador siguen haciendo único el id. Un XOR contra un byte
  // al azar lo deja igual de aleatorio.
  let time = Date.now();
  for (let i = 0; i < 6; i++) {
    bytes[i] ^= time % 256;
    time = Math.floor(time / 256);
  }
  fallbackCounter = (fallbackCounter + 1) % 65536;
  bytes[14] ^= fallbackCounter >> 8;
  bytes[15] ^= fallbackCounter & 0xff;

  return bytes;
}

/** Nueva llave para client_request_id: "3b241101-e2bb-4255-8caf-4136c566a962". */
export function newClientRequestId(): string {
  const cryptoApi = (globalThis as { crypto?: Crypto }).crypto;
  if (typeof cryptoApi?.randomUUID === "function") {
    try {
      return cryptoApi.randomUUID();
    } catch {
      // Sigue con los bytes al azar.
    }
  }

  const bytes = randomBytes();
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // versión 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante RFC 4122

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}
