/**
 * En producción se callan console.log/info/debug: la app tiene decenas de
 * logs de depuración (algunos con respuestas completas de la API) que en web
 * quedan a la vista en la consola del navegador. warn y error se conservan.
 *
 * Se importa primero en app/_layout.tsx.
 */
if (!__DEV__) {
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.debug = noop;
}

export {};
