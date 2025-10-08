import React, { useRef } from "react";
import { View } from "react-native";
import { Button, Text } from "react-native-paper";
import AppInput from "../AppInput";
import AppForm, { AppFormRef, useAppForm } from "./AppForm";

// Ejemplo de uso con ref
interface User {
  name: string;
  email: string;
  age: number;
}

export function ExampleWithRef() {
  const formRef = useRef<AppFormRef<User>>(null);

  const handleExternalSubmit = async () => {
    // Validar antes de enviar
    const errors = await formRef.current?.validateForm();
    if (Object.keys(errors || {}).length === 0) {
      await formRef.current?.submitForm();
    }
  };

  const handleSetRandomValues = () => {
    formRef.current?.setValues({
      name: "Juan Pérez",
      email: "juan@example.com",
      age: 30,
    });
  };

  const handleGetCurrentValues = () => {
    const values = formRef.current?.getValues();
    console.log("Current form values:", values);
  };

  return (
    <View>
      <AppForm<User>
        ref={formRef}
        initialValues={{ name: "", email: "", age: 0 }}
        onSubmit={async (values) => {
          console.log("Form submitted:", values);
        }}
      >
        <AppInput name="name" label="Nombre" placeholder="Ingresa tu nombre" />
        <AppInput
          name="email"
          label="Email"
          placeholder="Ingresa tu email"
          keyboardType="email-address"
        />
        <AppInput
          name="age"
          label="Edad"
          placeholder="Ingresa tu edad"
          keyboardType="numeric"
        />
      </AppForm>

      {/* Botones externos para controlar el formulario */}
      <View style={{ padding: 16, gap: 8 }}>
        <Button mode="contained" onPress={handleExternalSubmit}>
          Submit Externo
        </Button>
        <Button mode="outlined" onPress={handleSetRandomValues}>
          Llenar Datos
        </Button>
        <Button mode="text" onPress={handleGetCurrentValues}>
          Obtener Valores
        </Button>
      </View>
    </View>
  );
}

// Ejemplo usando el hook dentro de un componente hijo
function FormControls() {
  const form = useAppForm<User>();

  const handleSetName = () => {
    form.setFieldValue("name", "Nombre desde hook");
  };

  const handleShowValues = () => {
    console.log("Values from hook:", form.getValues());
    console.log("Is valid:", form.isValid());
    console.log("Is dirty:", form.isDirty());
    console.log("Is readonly:", form.readonly);
  };

  return (
    <View style={{ padding: 16, gap: 8 }}>
      <Text variant="titleMedium">Controles desde Hook</Text>
      <Button mode="outlined" onPress={handleSetName}>
        Cambiar Nombre
      </Button>
      <Button mode="text" onPress={handleShowValues}>
        Mostrar Info
      </Button>
      <Button
        mode="contained"
        onPress={() => form.submitForm()}
        disabled={!form.isValid()}
      >
        Submit desde Hook
      </Button>
    </View>
  );
}

export function ExampleWithHook() {
  return (
    <AppForm<User>
      initialValues={{ name: "", email: "", age: 0 }}
      readonly={false} // Cambiar a true para modo readonly
      onSubmit={async (values) => {
        console.log("Form submitted:", values);
      }}
    >
      <AppInput name="name" label="Nombre" placeholder="Ingresa tu nombre" />
      <AppInput
        name="email"
        label="Email"
        placeholder="Ingresa tu email"
        keyboardType="email-address"
      />
      <AppInput
        name="age"
        label="Edad"
        placeholder="Ingresa tu edad"
        keyboardType="numeric"
      />

      {/* Componente hijo que usa el hook */}
      <FormControls />
    </AppForm>
  );
}

// Ejemplo en modo readonly
export function ExampleReadonly() {
  return (
    <AppForm<User>
      initialValues={{
        name: "Usuario de Solo Lectura",
        email: "readonly@example.com",
        age: 25,
      }}
      readonly={true} // Modo solo lectura
    >
      <AppInput name="name" label="Nombre" />
      <AppInput name="email" label="Email" />
      <AppInput name="age" label="Edad" />
    </AppForm>
  );
}
