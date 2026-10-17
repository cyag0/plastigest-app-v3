import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import {
  ImageManipulator,
  type ImageManipulatorContext,
  type ImageRef,
  SaveFormat,
} from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import { Image, Platform, View } from "react-native";
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

// El API acepta imágenes de hasta 5 MB (jpg, png, webp) y una petición con
// varias fotos no debe pasar de lo que permite el servidor: las fotos se
// comprimen al elegirlas y las que siguen siendo muy pesadas se rechazan
// aquí, no al guardar.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
// Compresión JPEG del selector (en nativo; en web no la aplica).
const PICKER_QUALITY = 0.6;
// La foto se reduce a este lado mayor antes de subirla: en web con un canvas,
// en el teléfono con expo-image-manipulator.
const MAX_IMAGE_SIDE = 1600;
// Compresión JPEG de la foto reducida en el teléfono.
const NATIVE_JPEG_QUALITY = 0.7;

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const formatMegabytes = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);

/**
 * Web: reduce la foto (lado mayor MAX_IMAGE_SIDE) y la vuelve JPEG con un
 * canvas; el selector de web no comprime. Devuelve null si no se pudo.
 */
async function resizeImageOnWeb(
  uri: string,
): Promise<{ uri: string; size: number } | null> {
  if (typeof document === "undefined") return null;
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = document.createElement("img");
      element.onload = () => resolve(element);
      element.onerror = reject;
      element.src = uri;
    });
    const longest = Math.max(image.naturalWidth, image.naturalHeight);
    if (!longest) return null;
    const scale = Math.min(1, MAX_IMAGE_SIDE / longest);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) return null;
    // Fondo blanco: lo transparente de un PNG saldría negro en JPEG.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.8),
    );
    if (!blob) return null;
    return { uri: URL.createObjectURL(blob), size: blob.size };
  } catch {
    return null;
  }
}

/**
 * Teléfono: reduce la foto (lado mayor MAX_IMAGE_SIDE) y la guarda como JPEG
 * con expo-image-manipulator; el selector solo comprime y una foto de 12 MP
 * seguía pesando 1.5-3 MB. Si ya es chica y de un formato que el API acepta
 * no se toca. Devuelve null si no hizo falta o no se pudo.
 */
async function resizeImageOnNative(
  asset: ImagePicker.ImagePickerAsset,
  acceptedType: boolean,
): Promise<{ uri: string; size?: number } | null> {
  // El selector ya entrega el ancho y alto con la rotación EXIF aplicada.
  const longest = Math.max(asset.width || 0, asset.height || 0);
  if (!longest || (longest <= MAX_IMAGE_SIDE && acceptedType)) return null;

  let context: ImageManipulatorContext | null = null;
  let image: ImageRef | null = null;
  try {
    context = ImageManipulator.manipulate(asset.uri);
    if (longest > MAX_IMAGE_SIDE) {
      // Con un solo lado se conserva la proporción.
      context.resize(
        asset.width >= asset.height
          ? { width: MAX_IMAGE_SIDE }
          : { height: MAX_IMAGE_SIDE },
      );
    }
    image = await context.renderAsync();
    const saved = await image.saveAsync({
      compress: NATIVE_JPEG_QUALITY,
      format: SaveFormat.JPEG,
    });
    const info = await FileSystem.getInfoAsync(saved.uri).catch(() => null);
    return { uri: saved.uri, size: info?.exists ? info.size : undefined };
  } catch (error) {
    console.warn("No se pudo reducir la foto:", error);
    return null;
  } finally {
    // Libera ya el bitmap decodificado (decenas de MB en una foto grande).
    image?.release();
    context?.release();
  }
}

/**
 * Foto elegida o tomada → archivo para subir, con su tipo real (antes todas
 * se marcaban como image/jpeg aunque fueran PNG). Antes de subirla se reduce
 * (en web con un canvas, en el teléfono con expo-image-manipulator).
 */
async function toUploadedImage(
  asset: ImagePicker.ImagePickerAsset,
  prefix: "image" | "camera",
  index = 0,
): Promise<UploadedFile> {
  let uri = asset.uri;
  let type = asset.mimeType || "image/jpeg";
  let size = asset.fileSize;

  // Un formato que el API no acepta (gif, heic...) se queda en JPEG aunque
  // no pese menos.
  const acceptedType = Boolean(IMAGE_EXTENSIONS[type.toLowerCase()]);
  const resized =
    Platform.OS === "web"
      ? await resizeImageOnWeb(asset.uri)
      : await resizeImageOnNative(asset, acceptedType);
  if (
    resized &&
    (!size || resized.size === undefined || resized.size < size || !acceptedType)
  ) {
    uri = resized.uri;
    type = "image/jpeg";
    size = resized.size;
  }

  const extension = IMAGE_EXTENSIONS[type.toLowerCase()] ?? "jpg";
  return { uri, name: `${prefix}_${Date.now()}_${index}.${extension}`, type, size };
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
  error?: boolean | string;
  /** Lo inyecta FormUpload: error de validación ya tocado por el usuario. */
  hasError?: boolean;
  helperText?: string;
  itemStyle?: (file: UploadedFile, index: number) => any;
  onItemPress?: (file: UploadedFile, index: number) => void;
  readonly?: boolean;
  showCameraOption?: boolean;
  showGalleryOption?: boolean;
  showPreview?: boolean;
  renderButtons?: (handlers: {
    handleCameraPick: () => void;
    handleImagePick: () => void;
    handleDocumentPick: () => void;
    uploading: boolean;
    disabled: boolean;
  }) => React.ReactNode;
}

export default function AppUpload(props: AppUploadProps) {
  const [uploading, setUploading] = useState(false);
  const alerts = useAlerts();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const {
    value: rawValue,
    onChange,
    onBlur,
    multiple = false,
    accept = "all",
    maxFiles = 5,
    label = "Subir archivos",
    placeholder = "Selecciona archivos para subir",
    disabled = false,
    helperText,
  } = props;
  // Dentro de un formulario manda hasError (validación ya tocada); `error`
  // trae el texto del error aunque el usuario no haya tocado el campo.
  const error = props.hasError ?? Boolean(props.error);

  // Normalizar el valor a un array siempre
  const value = Array.isArray(rawValue) ? rawValue : [];

  /** Quita (y avisa) las fotos que siguen pasando del límite del servidor. */
  const withinSizeLimit = (files: UploadedFile[]) => {
    const tooBig = files.filter((file) => (file.size ?? 0) > MAX_IMAGE_BYTES);
    if (tooBig.length > 0) {
      alerts.warning(
        tooBig.length === 1
          ? `La foto pesa ${formatMegabytes(tooBig[0].size ?? 0)} MB y el máximo es 5 MB. Tómala con menos resolución o elige otra.`
          : `${tooBig.length} fotos pasan de 5 MB y no se agregaron. Tómalas con menos resolución o elige otras.`,
      );
    }
    return files.filter((file) => (file.size ?? 0) <= MAX_IMAGE_BYTES);
  };

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
          alerts.warning(`Solo puedes subir máximo ${maxFiles} archivos`);
        }
      }
    } catch (error) {
      console.error("Error picking document:", error);
      alerts.error("No se pudo seleccionar el archivo");
    } finally {
      setUploading(false);
      onBlur?.();
    }
  };

  const handleImagePick = async () => {
    try {
      setUploading(true);

      // Sin pedir permiso de galería: el selector del sistema (Photo Picker
      // en Android, PHPicker en iOS) no lo necesita. Pedirlo obligaría a
      // declarar READ_MEDIA_IMAGES, que Google Play restringe.
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: multiple,
        quality: PICKER_QUALITY,
        // iOS: entrega JPEG en vez de HEIC, que el API no acepta.
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });

      if (!result.canceled && result.assets) {
        // Una por una: reducir varias fotos grandes a la vez puede agotar la
        // memoria del teléfono.
        const converted: UploadedFile[] = [];
        for (const [index, asset] of result.assets.entries()) {
          converted.push(await toUploadedImage(asset, "image", index));
        }
        const newFiles = withinSizeLimit(converted);
        if (newFiles.length === 0) return;

        const updatedFiles = multiple ? [...value, ...newFiles] : newFiles;

        if (updatedFiles.length <= maxFiles) {
          onChange?.(updatedFiles);
        } else {
          alerts.warning(`Solo puedes subir máximo ${maxFiles} archivos`);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      alerts.error("No se pudo seleccionar la imagen");
    } finally {
      setUploading(false);
      onBlur?.();
    }
  };

  const handleCameraPick = async () => {
    try {
      setUploading(true);

      const permissionResult =
        await ImagePicker.requestCameraPermissionsAsync();

      if (permissionResult.granted === false) {
        alerts.warning("Se necesita permiso para acceder a la cámara");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: PICKER_QUALITY,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const [newFile] = withinSizeLimit([
          await toUploadedImage(result.assets[0], "camera"),
        ]);
        if (!newFile) return;

        const updatedFiles = multiple ? [...value, newFile] : [newFile];

        if (updatedFiles.length <= maxFiles) {
          onChange?.(updatedFiles);
        } else {
          alerts.warning(`Solo puedes subir máximo ${maxFiles} archivos`);
        }
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      alerts.error("No se pudo tomar la foto");
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

  const showCamera = props.showCameraOption !== false;
  const showGallery = props.showGalleryOption !== false;
  const showPreview = props.showPreview !== false;

  const buttonHandlers = {
    handleCameraPick,
    handleImagePick,
    handleDocumentPick,
    uploading,
    disabled,
  };

  return (
    <View style={styles.container}>
      {/* Upload Area */}
      {!props.readonly && (
        <>
          {props.renderButtons ? (
            props.renderButtons(buttonHandlers)
          ) : (
            <Card
              style={[
                styles.uploadArea,
                {
                  borderColor: error ? colors.error : colors.border,
                  backgroundColor: disabled
                    ? colors.surface
                    : colors.background,
                },
                error && styles.errorBorder,
              ]}
            >
              <Card.Content style={styles.uploadContent}>
                <Text
                  variant="bodyMedium"
                  style={[
                    styles.placeholder,
                    {
                      color: disabled
                        ? colors.textSecondary
                        : colors.text,
                    },
                  ]}
                >
                  {value.length > 0
                    ? `${value.length} archivo(s) seleccionado(s)`
                    : placeholder}
                </Text>

                <View style={styles.buttonContainer}>
                  {(accept === "images" || accept === "all") && (
                    <>
                      {showCamera && (
                        <Button
                          mode="outlined"
                          onPress={handleCameraPick}
                          disabled={disabled || uploading}
                          loading={uploading}
                          icon="camera"
                          style={[
                            styles.button,
                            { borderColor: colors.success },
                          ]}
                          textColor={colors.success}
                        >
                          Cámara
                        </Button>
                      )}
                      {showGallery && (
                        <Button
                          mode="outlined"
                          onPress={handleImagePick}
                          disabled={disabled || uploading}
                          loading={uploading}
                          icon="image"
                          style={[
                            styles.button,
                            { borderColor: colors.primary },
                          ]}
                          textColor={colors.primary}
                        >
                          Galería
                        </Button>
                      )}
                    </>
                  )}

                  {(accept === "documents" || accept === "all") && (
                    <Button
                      mode="outlined"
                      onPress={handleDocumentPick}
                      disabled={disabled || uploading}
                      loading={uploading}
                      icon="file-document"
                      style={[
                        styles.button,
                        { borderColor: colors.secondary },
                      ]}
                      textColor={colors.secondary}
                    >
                      Documentos
                    </Button>
                  )}
                </View>
              </Card.Content>
            </Card>
          )}
        </>
      )}

      {/* Selected Files */}
      {value.length > 0 && showPreview && (
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
                <Card
                  style={[
                    styles.fileCard,
                    itemStyle,
                    {
                      backgroundColor: props.readonly
                        ? colors.background
                        : colors.card,
                    },
                  ]}
                >
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
                            iconColor={colors.primary}
                          />
                        )}
                        <View style={styles.fileDetails}>
                          <Text variant="bodyMedium" numberOfLines={1}>
                            {file.name}
                          </Text>
                          {file.size && (
                            <Text
                              variant="bodySmall"
                              style={{ color: colors.textSecondary }}
                            >
                              {formatFileSize(file.size)}
                            </Text>
                          )}
                        </View>
                      </View>

                      {!disabled && !props.readonly && (
                        <IconButton
                          icon="close"
                          size={20}
                          iconColor={colors.error}
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
      {helperText && !props.readonly && (
        <Text
          variant="bodySmall"
          style={[
            styles.helperText,
            { color: error ? colors.error : colors.textSecondary },
          ]}
        >
          {helperText}
        </Text>
      )}

      {/* File Limit Info */}
      {multiple && !props.readonly && (
        <Text
          variant="bodySmall"
          style={[styles.helperText, { color: colors.textSecondary }]}
        >
          Máximo {maxFiles} archivos
        </Text>
      )}
    </View>
  );
}

const makeStyles = themedStyles((c) => ({
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
    borderColor: c.error,
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
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  button: {
    minWidth: 100,
  },
  filesContainer: {
    marginTop: 8,
  },
  fileCard: {
    marginBottom: 8,
    backgroundColor: c.card,
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
}));

export const FormUpload = MakeForm(AppUpload);
