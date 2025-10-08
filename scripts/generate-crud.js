#!/usr/bin/env node

const readline = require("readline");
const fs = require("fs");
const path = require("path");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Función para hacer preguntas de manera asíncrona
function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

// Función para capitalizar primera letra
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Función para convertir a camelCase
function toCamelCase(str) {
  return str.replace(/[-_\s](.)/g, (_, group1) => group1.toUpperCase());
}

// Función para convertir a PascalCase
function toPascalCase(str) {
  return capitalize(toCamelCase(str));
}

// Función para convertir a snake_case
function toSnakeCase(str) {
  return str
    .replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
    .replace(/^_/, "");
}

// Función para pluralizar (simplificada)
function pluralize(word) {
  if (word.endsWith("y")) {
    return word.slice(0, -1) + "ies";
  }
  if (
    word.endsWith("s") ||
    word.endsWith("sh") ||
    word.endsWith("ch") ||
    word.endsWith("x") ||
    word.endsWith("z")
  ) {
    return word + "es";
  }
  return word + "s";
}

async function main() {
  try {
    console.log("🚀 Generador de CRUD para Plastigest\n");

    // Preguntar por la ruta del módulo
    const modulePath = await question(
      "📁 Ingresa la ruta del módulo (ej: home/users, admin/products): "
    );

    // Preguntar por el nombre del modelo
    const modelName = await question(
      "📝 Ingresa el nombre del modelo (ej: user, product): "
    );

    // Preguntar por el endpoint de la API
    const apiEndpoint = await question(
      "🌐 Ingresa el endpoint de la API (ej: /auth/admin/users, /api/products): "
    );

    // Confirmar información
    console.log("\n📋 Resumen de configuración:");
    console.log(`   Ruta del módulo: ${modulePath}`);
    console.log(`   Nombre del modelo: ${modelName}`);
    console.log(`   Endpoint API: ${apiEndpoint}`);

    const confirm = await question(
      "\n✅ ¿Continuar con la generación? (y/n): "
    );

    if (confirm.toLowerCase() !== "y" && confirm.toLowerCase() !== "yes") {
      console.log("❌ Generación cancelada.");
      rl.close();
      return;
    }

    // Procesar nombres y rutas
    const modelNameSingular = modelName.toLowerCase();
    const modelNamePlural = pluralize(modelNameSingular);
    const ModelNamePascal = toPascalCase(modelNameSingular);
    const modelNameCamel = toCamelCase(modelNameSingular);
    const modelNamePluralPascal = toPascalCase(modelNamePlural);

    const basePath = path.join(
      process.cwd(),
      "app",
      "(tabs)",
      modulePath,
      modelNamePlural
    );
    const servicePath = path.join(
      process.cwd(),
      "utils",
      "services",
      modulePath.replace("/", path.sep),
      modelNamePlural
    );

    console.log("\n🔨 Generando archivos...");

    // Crear directorios
    await createDirectories(basePath, servicePath);

    // Generar archivos
    await generateFiles(basePath, servicePath, {
      modelNameSingular,
      modelNamePlural,
      ModelNamePascal,
      modelNameCamel,
      modelNamePluralPascal,
      apiEndpoint,
      modulePath,
    });

    console.log("✅ ¡CRUD generado exitosamente!");
    console.log(`📂 Archivos creados en: ${basePath}`);
    console.log(`🔧 Servicio creado en: ${servicePath}`);

    rl.close();
  } catch (error) {
    console.error("❌ Error durante la generación:", error.message);
    rl.close();
    process.exit(1);
  }
}

async function createDirectories(basePath, servicePath) {
  // Crear directorio base del módulo
  if (!fs.existsSync(basePath)) {
    fs.mkdirSync(basePath, { recursive: true });
  }

  // Crear directorio [id]
  const idPath = path.join(basePath, "[id]");
  if (!fs.existsSync(idPath)) {
    fs.mkdirSync(idPath, { recursive: true });
  }

  // Crear directorio del servicio
  if (!fs.existsSync(servicePath)) {
    fs.mkdirSync(servicePath, { recursive: true });
  }
}

async function generateFiles(basePath, servicePath, config) {
  // Generar templates
  const templates = generateTemplates(config);

  // Escribir archivos
  const files = [
    { path: path.join(basePath, "_layout.tsx"), content: templates.layout },
    { path: path.join(basePath, "index.tsx"), content: templates.index },
    { path: path.join(basePath, "form.tsx"), content: templates.form },
    {
      path: path.join(basePath, "[id]", "index.tsx"),
      content: templates.detail,
    },
    { path: path.join(basePath, "[id]", "edit.tsx"), content: templates.edit },
    { path: path.join(servicePath, "index.ts"), content: templates.service },
  ];

  for (const file of files) {
    fs.writeFileSync(file.path, file.content);
    console.log(`   ✓ ${path.relative(process.cwd(), file.path)}`);
  }
}

function generateTemplates(config) {
  const {
    modelNameSingular,
    modelNamePlural,
    ModelNamePascal,
    modelNameCamel,
    modelNamePluralPascal,
    apiEndpoint,
    modulePath,
  } = config;

  return {
    layout: `import AppBar from "@/components/App/AppBar";
import { Stack } from "expo-router";

export default function ${modelNamePluralPascal}Layout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        header: ({ options, route }) => (
          <AppBar
            title={options.title || route.name}
            onSearchPress={() => console.log("Search pressed")}
            onNotificationPress={() => console.log("Notifications pressed")}
            onProfilePress={() => console.log("Profile pressed")}
          />
        ),
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "${capitalize(modelNamePlural)}",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="form"
        options={{
          title: "Crear ${ModelNamePascal}",
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: "Detalle ${ModelNamePascal}",
        }}
      />
    </Stack>
  );
}
`,

    index: `import AppList from "@/components/App/AppList/AppList";
import { AppModalRef } from "@/components/Modal/AppModal";
import FilterModal from "@/components/Modal/FilterModal";
import palette from "@/constants/palette";
import Services from "@/utils/services";
import { useRouter } from "expo-router";
import * as React from "react";
import { View } from "react-native";
import { Chip } from "react-native-paper";

export default function ${modelNamePluralPascal}ListScreen() {
  const navigation = useRouter();
  const modalRef = React.useRef<AppModalRef>(null);

  return (
    <>
      <AppList
        title="${capitalize(modelNamePlural)}"
        service={Services.${modulePath.replace("/", ".")}.${modelNamePlural}}
        renderCard={({ item }) => ({
          title: item.name || item.title || \`${ModelNamePascal} #\${item.id}\`,
          description: (
            <React.Fragment>
              <AppList.Description>{item.description || 'Sin descripción'}</AppList.Description>
            </React.Fragment>
          ),
          right: (
            <React.Fragment>
              {item.is_active !== undefined && (
                <Chip
                  style={{
                    backgroundColor: item.is_active
                      ? palette.primary
                      : palette.red,
                    marginBottom: 4,
                  }}
                  textStyle={{ color: "white" }}
                  compact
                >
                  {item.is_active ? "Activo" : "Inactivo"}
                </Chip>
              )}
            </React.Fragment>
          ),
        })}
        onItemPress={(entity) => {
          navigation.push("/(tabs)/${modulePath}/${modelNamePlural}/" + entity.id);
        }}
        onPressCreate={() => {
          navigation.push("/(tabs)/${modulePath}/${modelNamePlural}/form");
        }}
        searchPlaceholder="Buscar ${modelNamePlural}..."
      />

      <FilterModal ref={modalRef} />
    </>
  );
}
`,

    form: `import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormCheckBox } from "@/components/Form/AppCheckBox";
import palette from "@/constants/palette";
import Services from "@/utils/services";
import React, { useRef } from "react";
import { StyleSheet, View } from "react-native";

interface ${ModelNamePascal} {
  name: string;
  description: string;
  is_active: boolean;
}

interface ${ModelNamePascal}Props {
  id?: number;
  readonly?: boolean;
}

export default function Create${ModelNamePascal}Screen(props: ${ModelNamePascal}Props) {
  const formRef = useRef<AppFormRef<${ModelNamePascal}>>(null);

  return (
    <View style={styles.container}>
      <AppForm
        ref={formRef}
        service={Services.${modulePath.replace("/", ".")}.${modelNamePlural}}
        defaultValues={{
          name: "",
          description: "",
          is_active: true,
        }}
        id={props.id}
        readonly={props.readonly}
      >
        <FormInput
          name="name"
          label="Nombre"
          placeholder="Ingrese el nombre"
          rules={{ required: "El nombre es requerido" }}
        />
        
        <FormInput
          name="description"
          label="Descripción"
          placeholder="Ingrese una descripción"
          multiline
          numberOfLines={3}
        />
        
        <FormCheckBox
          name="is_active"
          label="Activo"
        />
      </AppForm>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
});
`,

    detail: `import { useLocalSearchParams } from "expo-router";
import Create${ModelNamePascal}Screen from "../form";

export default function ${ModelNamePascal}DetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <Create${ModelNamePascal}Screen id={Number(id)} readonly />;
}
`,

    edit: `import { useLocalSearchParams } from "expo-router";
import Create${ModelNamePascal}Screen from "../form";

export default function Edit${ModelNamePascal}Screen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <Create${ModelNamePascal}Screen id={Number(id)} />;
}
`,

    service: `import createCrudService from "${generateRelativePath(
      servicePath,
      "crudService.ts"
    )}";

export default {
  ...createCrudService<App.Entities.${ModelNamePascal}>("${apiEndpoint}"),
};
`,
  };
}

function generateRelativePath(from, to) {
  const fromParts = from.split(path.sep);
  const toParts = path
    .join(process.cwd(), "utils", "services", to)
    .split(path.sep);

  // Encontrar el ancestro común
  let commonLength = 0;
  while (
    commonLength < fromParts.length &&
    commonLength < toParts.length &&
    fromParts[commonLength] === toParts[commonLength]
  ) {
    commonLength++;
  }

  // Calcular cuántos niveles hay que subir
  const upLevels = fromParts.length - commonLength;

  // Construir la ruta relativa
  let relativePath = "";
  for (let i = 0; i < upLevels; i++) {
    relativePath += "../";
  }

  // Agregar el resto del path
  relativePath += toParts.slice(commonLength).join("/");

  return relativePath;
}

// Ejecutar el script
main();
