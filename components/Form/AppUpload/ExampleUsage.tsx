import AppUpload, {
  FormUpload,
  UploadedFile,
} from "@/components/Form/AppUpload";
import React, { useState } from "react";
import { ScrollView } from "react-native";
import { Button, Text } from "react-native-paper";

export default function UploadExample() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [documentFiles, setDocumentFiles] = useState<UploadedFile[]>([]);
  const [imageFiles, setImageFiles] = useState<UploadedFile[]>([]);

  const handleSubmit = () => {
    console.log("Archivos seleccionados:", files);
    console.log("Documentos:", documentFiles);
    console.log("Imágenes:", imageFiles);
  };

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <Text variant="headlineSmall" style={{ marginBottom: 24 }}>
        Ejemplos de AppUpload
      </Text>

      {/* Upload general - cualquier tipo de archivo */}
      <AppUpload
        label="Subir archivos (cualquier tipo)"
        placeholder="Selecciona archivos para subir"
        value={files}
        onChange={setFiles}
        multiple
        maxFiles={3}
        accept="all"
        helperText="Puedes subir hasta 3 archivos de cualquier tipo"
      />

      {/* Upload solo documentos */}
      <AppUpload
        label="Subir documentos"
        placeholder="Selecciona documentos PDF, Word, etc."
        value={documentFiles}
        onChange={setDocumentFiles}
        multiple
        maxFiles={5}
        accept="documents"
        helperText="Solo se permiten documentos (PDF, Word, Excel)"
      />

      {/* Upload solo imágenes */}
      <AppUpload
        label="Subir imágenes"
        placeholder="Selecciona imágenes de la galería"
        value={imageFiles}
        onChange={setImageFiles}
        multiple
        maxFiles={10}
        accept="images"
        helperText="Solo se permiten imágenes"
      />

      {/* Upload individual */}
      <AppUpload
        label="Subir archivo individual"
        placeholder="Selecciona un solo archivo"
        value={[]}
        onChange={() => {}}
        multiple={false}
        accept="all"
        helperText="Solo se permite un archivo"
      />

      <Button mode="contained" onPress={handleSubmit} style={{ marginTop: 24 }}>
        Enviar archivos
      </Button>
    </ScrollView>
  );
}

// Ejemplo con FormUpload (integrado con Formik)
export function FormUploadExample() {
  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <Text variant="headlineSmall" style={{ marginBottom: 24 }}>
        Ejemplo con Formik
      </Text>

      {/* Este sería usado dentro de un AppForm */}
      <FormUpload
        name="attachments"
        label="Archivos adjuntos"
        placeholder="Subir documentos relacionados"
        multiple
        maxFiles={5}
        accept="documents"
        helperText="Subir facturas, contratos, etc."
      />
    </ScrollView>
  );
}
