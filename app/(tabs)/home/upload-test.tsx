import AppUpload, { UploadedFile } from "@/components/Form/AppUpload";
import palette from "@/constants/palette";
import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { Button, Card, Text } from "react-native-paper";

export default function UploadTestPage() {
  const [productImages, setProductImages] = useState<UploadedFile[]>([]);
  const [documents, setDocuments] = useState<UploadedFile[]>([]);
  const [allFiles, setAllFiles] = useState<UploadedFile[]>([]);

  const handleSubmit = () => {
    console.log("Imágenes del producto:", productImages);
    console.log("Documentos:", documents);
    console.log("Todos los archivos:", allFiles);

    // Aquí podrías enviar los archivos al servidor
    alert(
      `Archivos seleccionados:\n- Imágenes: ${productImages.length}\n- Documentos: ${documents.length}\n- Otros: ${allFiles.length}`
    );
  };

  const clearAll = () => {
    setProductImages([]);
    setDocuments([]);
    setAllFiles([]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.background }}>
      <View style={{ padding: 16 }}>
        <Text
          variant="headlineSmall"
          style={{ marginBottom: 24, textAlign: "center" }}
        >
          Prueba del Componente AppUpload
        </Text>

        {/* Upload solo para imágenes */}
        <Card style={{ marginBottom: 16, backgroundColor: palette.surface }}>
          <Card.Content>
            <Text
              variant="titleMedium"
              style={{ marginBottom: 12, fontWeight: "bold" }}
            >
              📸 Imágenes del Producto
            </Text>

            <AppUpload
              label="Imágenes del producto"
              placeholder="Selecciona fotos del producto"
              value={productImages}
              onChange={setProductImages}
              multiple
              maxFiles={5}
              accept="images"
              helperText="Solo se permiten imágenes (JPG, PNG, etc.)"
            />
          </Card.Content>
        </Card>

        {/* Upload solo para documentos */}
        <Card style={{ marginBottom: 16, backgroundColor: palette.surface }}>
          <Card.Content>
            <Text
              variant="titleMedium"
              style={{ marginBottom: 12, fontWeight: "bold" }}
            >
              📄 Documentos Técnicos
            </Text>

            <AppUpload
              label="Documentos del producto"
              placeholder="Subir fichas técnicas, certificados, etc."
              value={documents}
              onChange={setDocuments}
              multiple
              maxFiles={3}
              accept="documents"
              helperText="PDFs, Word, Excel - máximo 3 archivos"
            />
          </Card.Content>
        </Card>

        {/* Upload para cualquier tipo de archivo */}
        <Card style={{ marginBottom: 16, backgroundColor: palette.surface }}>
          <Card.Content>
            <Text
              variant="titleMedium"
              style={{ marginBottom: 12, fontWeight: "bold" }}
            >
              📁 Archivos Diversos
            </Text>

            <AppUpload
              label="Otros archivos"
              placeholder="Cualquier tipo de archivo"
              value={allFiles}
              onChange={setAllFiles}
              multiple
              maxFiles={10}
              accept="all"
              helperText="Cualquier tipo de archivo - hasta 10 archivos"
            />
          </Card.Content>
        </Card>

        {/* Upload individual */}
        <Card style={{ marginBottom: 24, backgroundColor: palette.surface }}>
          <Card.Content>
            <Text
              variant="titleMedium"
              style={{ marginBottom: 12, fontWeight: "bold" }}
            >
              📋 Archivo Individual
            </Text>

            <AppUpload
              label="Manual del producto"
              placeholder="Seleccionar un solo archivo"
              value={[]}
              onChange={() => {}}
              multiple={false}
              accept="documents"
              helperText="Solo se permite un archivo"
            />
          </Card.Content>
        </Card>

        {/* Botones de acción */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Button mode="contained" onPress={handleSubmit} style={{ flex: 1 }}>
            Enviar Archivos
          </Button>

          <Button mode="outlined" onPress={clearAll} style={{ flex: 1 }}>
            Limpiar Todo
          </Button>
        </View>

        {/* Resumen de archivos seleccionados */}
        <Card style={{ marginTop: 16, backgroundColor: palette.card }}>
          <Card.Content>
            <Text
              variant="titleMedium"
              style={{ marginBottom: 8, fontWeight: "bold" }}
            >
              📊 Resumen
            </Text>

            <Text variant="bodyMedium">
              • Imágenes: {productImages.length} archivo(s)
            </Text>
            <Text variant="bodyMedium">
              • Documentos: {documents.length} archivo(s)
            </Text>
            <Text variant="bodyMedium">
              • Otros: {allFiles.length} archivo(s)
            </Text>
            <Text
              variant="bodyMedium"
              style={{ fontWeight: "bold", marginTop: 8 }}
            >
              Total: {productImages.length + documents.length + allFiles.length}{" "}
              archivo(s)
            </Text>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
}
