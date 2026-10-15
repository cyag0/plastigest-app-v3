// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Carpetas generadas: los exports web (dist/, .expo/help-web de las
    // capturas de la ayuda) traen miles de "errores" de código minificado que
    // tapaban los del código fuente, y android/ios salen de `expo prebuild`.
    ignores: ['dist/**', 'web-build/**', '.expo/**', 'android/**', 'ios/**'],
  },
]);
