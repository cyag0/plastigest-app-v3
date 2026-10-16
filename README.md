# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Versiones de la app (tiendas)

El aviso "Actualiza la app" compara `expo.version` de `app.json` con
`MIN_NATIVE_APP_VERSION` del backend (`GET /api/app/version`). EAS sube solo el
versionCode/buildNumber, no esa versión: si no se sube a mano, todos los builds
dicen lo mismo y no se puede obligar a actualizar.

1. Antes de cada build para las tiendas: `npm run version:bump -- patch` (o
   `minor`, `major`, `1.2.3`) y commit.
2. `eas build --profile production`. El hook `eas-build-pre-install`
   (`npm run version:check`) detiene el build si la versión no es mayor que
   `LATEST_NATIVE_APP_VERSION` o es menor que `MIN_NATIVE_APP_VERSION`; si el
   API no responde solo avisa.
3. Ya publicada en las dos tiendas: `LATEST_NATIVE_APP_VERSION=<versión>` en el
   backend (aviso "Hay una versión nueva"). Para obligar a actualizar,
   `MIN_NATIVE_APP_VERSION=<versión>`, solo con una versión ya publicada.
   Vacía, o menor o igual que la instalada, nunca bloquea; la app tampoco
   bloquea si no sabe su versión.

Web: cada despliegue en Cloudflare Pages es una versión nueva; si una pestaña
abierta ya no encuentra un archivo del build anterior, la app ofrece recargar.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a
[text](.)

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
