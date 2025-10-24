import palette from "@/constants/palette";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import { Alert, Image, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  IconButton,
  Text,
  TouchableRipple,
} from "react-native-paper";
import MakeForm from "../AppForm/hoc";

export interface UploadedFile {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

interface AppUploadProps {
  value?: UploadedFile[];
  onChange?: (files: UploadedFile[]) => void;
  onBlur?: () => void;
  multiple?: boolean;
  accept?: "images" | "documents" | "all";
  maxFiles?: number;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  itemStyle?: (file: UploadedFile, index: number) => any;
  onItemPress?: (file: UploadedFile, index: number) => void;
}

export default function AppUpload(props: AppUploadProps) {
  const [uploading, setUploading] = useState(false);

  const {
    value = [],
    onChange,
    onBlur,
    multiple = false,
    accept = "all",
    maxFiles = 5,
    label = "Subir archivos",
    placeholder = "Selecciona archivos para subir",
    disabled = false,
    error = false,
    helperText,
  } = props;

  const handleDocumentPick = async () => {
    try {
      setUploading(true);

      const result = await DocumentPicker.getDocumentAsync({
        multiple,
        type:
          accept === "documents"
            ? [
                "application/pdf",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              ]
            : "*/*",
      });

      if (!result.canceled && result.assets) {
        const newFiles: UploadedFile[] = result.assets.map((asset) => ({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || "application/octet-stream",
          size: asset.size,
        }));

        const updatedFiles = multiple ? [...value, ...newFiles] : newFiles;

        if (updatedFiles.length <= maxFiles) {
          onChange?.(updatedFiles);
        } else {
          Alert.alert(
            "Límite excedido",
            `Solo puedes subir máximo ${maxFiles} archivos`
          );
        }
      }
    } catch (error) {
      console.error("Error picking document:", error);
      Alert.alert("Error", "No se pudo seleccionar el archivo");
    } finally {
      setUploading(false);
      onBlur?.();
    }
  };

  const handleImagePick = async () => {
    try {
      setUploading(true);

      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert(
          "Permisos necesarios",
          "Se necesita permiso para acceder a la galería"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: multiple,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newFiles: UploadedFile[] = result.assets.map((asset, index) => ({
          uri: asset.uri,
          name: `image_${Date.now()}_${index}.jpg`,
          type: "image/jpeg",
          size: asset.fileSize,
        }));

        const updatedFiles = multiple ? [...value, ...newFiles] : newFiles;

        if (updatedFiles.length <= maxFiles) {
          onChange?.(updatedFiles);
        } else {
          Alert.alert(
            "Límite excedido",
            `Solo puedes subir máximo ${maxFiles} archivos`
          );
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "No se pudo seleccionar la imagen");
    } finally {
      setUploading(false);
      onBlur?.();
    }
  };

  const handleRemoveFile = (index: number) => {
    const updatedFiles = value.filter((_, i) => i !== index);
    onChange?.(updatedFiles);
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string): string => {
    if (type.startsWith("image/")) return "image";
    if (type.includes("pdf")) return "file-pdf-box";
    if (type.includes("word") || type.includes("document"))
      return "file-word-box";
    if (type.includes("excel") || type.includes("spreadsheet"))
      return "file-excel-box";
    return "file-document";
  };

  return (
    <View style={styles.container}>
      {/*  {label && (
        <Text
          variant="bodyMedium"
          style={[
            styles.label,
            { color: error ? palette.error : palette.textSecondary },
          ]}
        >
          {label}
        </Text>
      )}
 */}
      {/* Upload Area */}
      <Card
        style={[
          styles.uploadArea,
          {
            borderColor: error ? palette.error : palette.border,
            backgroundColor: disabled ? palette.surface : palette.background,
          },
          error && styles.errorBorder,
        ]}
      >
        <Card.Content style={styles.uploadContent}>
          <Text
            variant="bodyMedium"
            style={[
              styles.placeholder,
              { color: disabled ? palette.textSecondary : palette.text },
            ]}
          >
            {value.length > 0
              ? `${value.length} archivo(s) seleccionado(s)`
              : placeholder}
          </Text>

          <View style={styles.buttonContainer}>
            {(accept === "images" || accept === "all") && (
              <Button
                mode="outlined"
                onPress={handleImagePick}
                disabled={disabled || uploading}
                loading={uploading}
                icon="image"
                style={[styles.button, { borderColor: palette.primary }]}
                textColor={palette.primary}
              >
                Galería
              </Button>
            )}

            {(accept === "documents" || accept === "all") && (
              <Button
                mode="outlined"
                onPress={handleDocumentPick}
                disabled={disabled || uploading}
                loading={uploading}
                icon="file-document"
                style={[styles.button, { borderColor: palette.secondary }]}
                textColor={palette.secondary}
              >
                Documentos
              </Button>
            )}
          </View>
        </Card.Content>
      </Card>

      {/* Selected Files */}
      {value.length > 0 && (
        <View style={styles.filesContainer}>
          {value.map((file, index) => {
            const itemStyle = props.itemStyle
              ? props.itemStyle(file, index)
              : {};

            const isImage = file.type.startsWith("image/");

            return (
              <TouchableRipple
                key={index}
                onPress={() => {
                  props.onItemPress?.(file, index);
                }}
              >
                <Card style={[styles.fileCard, itemStyle]}>
                  <Card.Content style={styles.fileContent}>
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <View style={styles.fileInfo}>
                        {isImage ? (
                          <Image
                            source={{
                              uri: file.uri,
                            }}
                            style={{ width: 56, height: 56, borderRadius: 8 }}
                          />
                        ) : (
                          <IconButton
                            icon={getFileIcon(file.type)}
                            size={24}
                            iconColor={palette.primary}
                          />
                        )}
                        <View style={styles.fileDetails}>
                          <Text variant="bodyMedium" numberOfLines={1}>
                            {file.name}
                          </Text>
                          {file.size && (
                            <Text
                              variant="bodySmall"
                              style={{ color: palette.textSecondary }}
                            >
                              {formatFileSize(file.size)}
                            </Text>
                          )}
                        </View>
                      </View>

                      {!disabled && (
                        <IconButton
                          icon="close"
                          size={20}
                          iconColor={palette.error}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleRemoveFile(index);
                          }}
                        />
                      )}
                    </View>
                  </Card.Content>
                </Card>
              </TouchableRipple>
            );
          })}
        </View>
      )}

      {/* Helper Text */}
      {helperText && (
        <Text
          variant="bodySmall"
          style={[
            styles.helperText,
            { color: error ? palette.error : palette.textSecondary },
          ]}
        >
          {helperText}
        </Text>
      )}

      {/* File Limit Info */}
      {multiple && (
        <Text
          variant="bodySmall"
          style={[styles.helperText, { color: palette.textSecondary }]}
        >
          Máximo {maxFiles} archivos
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    marginBottom: 8,
    fontWeight: "500",
  },
  uploadArea: {
    marginBottom: 8,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  errorBorder: {
    borderColor: palette.error,
  },
  uploadContent: {
    alignItems: "center",
    paddingVertical: 16,
  },
  placeholder: {
    textAlign: "center",
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 8,
  },
  button: {
    minWidth: 100,
  },
  filesContainer: {
    marginTop: 8,
  },
  fileCard: {
    marginBottom: 8,
    backgroundColor: palette.card,
  },
  fileContent: {
    paddingVertical: 8,
  },
  fileInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  fileDetails: {
    flex: 1,
    marginLeft: 8,
  },
  helperText: {
    marginTop: 4,
  },
});

export const FormUpload = MakeForm(AppUpload);
