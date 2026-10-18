import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import MakeForm, { InputLabel } from "../AppForm/hoc";
import PhotoViewer from "./PhotoViewer";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

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

/** Tamaño de las miniaturas y de los botones de agregar. */
const THUMB = 80;

const formatFileSize = (bytes?: number | null): string => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fileIcon = (type: string): IconName => {
  if (type.includes("pdf")) return "file-pdf-box";
  if (type.includes("word") || type.includes("document")) return "file-word-box";
  if (type.includes("excel") || type.includes("spreadsheet")) return "file-excel-box";
  if (type.startsWith("image/")) return "file-image-outline";
  return "file-document-outline";
};

/**
 * ¿Se muestra como foto? Por su tipo; sin tipo (algunos registros viejos),
 * por la extensión del nombre o de la dirección.
 */
function isImageFile(file: UploadedFile): boolean {
  const type = typeof file.type === "string" ? file.type.toLowerCase() : "";
  if (type) return type.startsWith("image/");
  const name = `${file.name ?? ""} ${file.uri ?? ""}`.toLowerCase();
  return /\.(jpe?g|png|webp|gif|heic|heif)(\?|\s|$)/.test(name);
}

export interface AppUploadProps {
  value?: UploadedFile[];
  onChange?: (files: UploadedFile[]) => void;
  onBlur?: () => void;
  multiple?: boolean;
  accept?: "images" | "documents" | "all";
  maxFiles?: number;
  /** Etiqueta arriba (fuera de un formulario; FormUpload pinta la suya). */
  label?: string;
  /** Texto junto a "Agregar foto" mientras no hay archivos. */
  placeholder?: string;
  disabled?: boolean;
  error?: boolean | string;
  /** Lo inyecta FormUpload: error de validación ya tocado por el usuario. */
  hasError?: boolean;
  helperText?: string;
  itemStyle?: (file: UploadedFile, index: number) => any;
  /** Al tocar un archivo. Sin él, las fotos se abren a pantalla completa. */
  onItemPress?: (file: UploadedFile, index: number) => void;
  readonly?: boolean;
  showCameraOption?: boolean;
  showGalleryOption?: boolean;
  showPreview?: boolean;
  /** "2 de 5 fotos" debajo (por omisión, con `multiple`). */
  showLimitHint?: boolean;
  renderButtons?: (handlers: {
    handleCameraPick: () => void;
    handleImagePick: () => void;
    handleDocumentPick: () => void;
    uploading: boolean;
    disabled: boolean;
  }) => React.ReactNode;
}

/**
 * Fotos y documentos de un formulario: las fotos como miniaturas (tocar para
 * verla, × para quitarla) con un botón de agregar al final; los documentos
 * como renglones con ícono, nombre y tamaño. `renderButtons` reemplaza los
 * botones de agregar.
 */
export default function AppUpload(props: AppUploadProps & { embedded?: boolean }) {
  const [uploading, setUploading] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
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
    placeholder,
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

  const showCamera = props.showCameraOption !== false;
  const showGallery = props.showGalleryOption !== false;
  const showPreview = props.showPreview !== false;
  const readonly = !!props.readonly;
  const busy = disabled || uploading;

  const buttonHandlers = {
    handleCameraPick,
    handleImagePick,
    handleDocumentPick,
    uploading,
    disabled,
  };

  // Lo que viene del API puede traer huecos (una foto que ya no existe llega
  // como null): se saltan, pero cada archivo conserva su índice en `value`.
  const entries = value
    .map((file, index) => ({ file, index }))
    .filter(({ file }) => !!file && typeof file === "object");
  // Con accept="images" todo es foto (el API marca como octet-stream una
  // extensión que no conoce).
  const isImage = (file: UploadedFile) => accept === "images" || isImageFile(file);
  const imageEntries = entries.filter(({ file }) => isImage(file));
  const documentEntries = entries.filter(({ file }) => !isImage(file));
  const photoUris = imageEntries.map(({ file }) => file.uri);

  // Botones de agregar. En web "Tomar foto" abría el mismo selector de
  // archivos (y pedía permiso de cámara): ahí basta con "Agregar foto".
  const isWeb = Platform.OS === "web";
  const acceptsImages = accept !== "documents";
  const acceptsDocuments = accept !== "images";
  const full = multiple && value.length >= maxFiles;
  const canAdd = !readonly && !full && !props.renderButtons;
  const replacing = !multiple && value.length > 0;
  const cameraTile = acceptsImages && showCamera && (!isWeb || !showGallery);
  const galleryTile = acceptsImages && showGallery;
  // Solo documentos: el renglón "Agregar documento" va en su lista.
  const documentTile = acceptsDocuments && acceptsImages;
  const documentRow = accept === "documents";

  const addTiles: React.ReactNode[] = [];
  if (canAdd) {
    if (cameraTile) {
      addTiles.push(
        <AddTile
          key="camera"
          icon="camera-outline"
          label="Tomar foto"
          onPress={handleCameraPick}
          disabled={busy}
          busy={uploading}
          error={error}
        />,
      );
    }
    if (galleryTile) {
      addTiles.push(
        <AddTile
          key="gallery"
          icon="image-plus-outline"
          label={
            isWeb || !cameraTile
              ? replacing
                ? "Cambiar foto"
                : "Agregar foto"
              : "Galería"
          }
          onPress={handleImagePick}
          disabled={busy}
          busy={uploading}
          error={error}
        />,
      );
    }
    if (documentTile) {
      addTiles.push(
        <AddTile
          key="document"
          icon="file-plus-outline"
          label="Documento"
          onPress={handleDocumentPick}
          disabled={busy}
          busy={uploading}
          error={error}
        />,
      );
    }
  }

  const thumbnails = showPreview
    ? imageEntries.map(({ file, index }, position) => (
        <View
          key={`${file.uri}-${index}`}
          style={[styles.thumb, props.itemStyle?.(file, index)]}
        >
          <Pressable
            onPress={() =>
              props.onItemPress
                ? props.onItemPress(file, index)
                : setViewerIndex(position)
            }
            style={({ pressed }) => [styles.thumbPress, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityLabel={`Ver foto ${position + 1}`}
          >
            {file.uri ? (
              <Image source={{ uri: file.uri }} style={styles.thumbImage} resizeMode="cover" />
            ) : (
              <MaterialCommunityIcons name="image-outline" size={24} color={colors.textMuted} />
            )}
          </Pressable>
          {!readonly && !disabled && (
            <Pressable
              onPress={() => handleRemoveFile(index)}
              hitSlop={6}
              style={styles.thumbRemove}
              accessibilityRole="button"
              accessibilityLabel={`Quitar foto ${position + 1}`}
            >
              <MaterialCommunityIcons name="close" size={14} color="#FFFFFF" />
            </Pressable>
          )}
        </View>
      ))
    : [];

  const showDocuments =
    (showPreview && documentEntries.length > 0) || (documentRow && canAdd);
  const showGrid = thumbnails.length > 0 || (addTiles.length > 0 && !documentRow);

  // Mientras no hay archivos, el texto de ayuda va junto a los botones.
  const emptyPlaceholder =
    canAdd && value.length === 0 && !documentRow ? placeholder : null;

  const kind = accept === "images" ? "fotos" : "archivos";
  const limitHint =
    multiple && !readonly && props.showLimitHint !== false && value.length > 0
      ? `${value.length} de ${maxFiles} ${kind}`
      : null;

  return (
    <View
      style={
        // Dentro de un formulario (FormUpload) el espacio lo pone el campo;
        // suelto o con botones propios conserva el margen de antes.
        props.embedded && !props.renderButtons ? undefined : styles.container
      }
    >
      {!!props.label && !props.embedded && <InputLabel label={props.label} />}

      {!readonly && props.renderButtons?.(buttonHandlers)}

      {showGrid && (
        <View style={styles.grid}>
          {thumbnails}
          {!documentRow && addTiles}
          {!!emptyPlaceholder && (
            <Text style={styles.placeholder}>{emptyPlaceholder}</Text>
          )}
        </View>
      )}

      {showDocuments && (
        <View style={[styles.documents, showGrid && { marginTop: 8 }]}>
          {showPreview &&
            documentEntries.map(({ file, index }, position) => (
              <React.Fragment key={`${file.uri}-${index}`}>
                {position > 0 && <View style={styles.divider} />}
                <View style={[styles.documentRow, props.itemStyle?.(file, index)]}>
                  <Pressable
                    onPress={() => {
                      if (props.onItemPress) props.onItemPress(file, index);
                      else if (/^https?:\/\//.test(file.uri ?? "")) {
                        Linking.openURL(file.uri).catch(() => {});
                      }
                    }}
                    style={styles.documentMain}
                    accessibilityRole="button"
                    accessibilityLabel={file.name}
                  >
                    <MaterialCommunityIcons
                      name={fileIcon(typeof file.type === "string" ? file.type : "")}
                      size={22}
                      color={colors.textSecondary}
                    />
                    <View style={styles.documentBody}>
                      <Text style={styles.documentName} numberOfLines={1}>
                        {file.name || "Archivo"}
                      </Text>
                      {!!file.size && (
                        <Text style={styles.documentMeta}>{formatFileSize(file.size)}</Text>
                      )}
                    </View>
                  </Pressable>
                  {!readonly && !disabled && (
                    <Pressable
                      onPress={() => handleRemoveFile(index)}
                      hitSlop={8}
                      style={styles.documentRemove}
                      accessibilityRole="button"
                      accessibilityLabel={`Quitar ${file.name || "archivo"}`}
                    >
                      <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
                    </Pressable>
                  )}
                </View>
              </React.Fragment>
            ))}
          {documentRow && canAdd && (
            <>
              {showPreview && documentEntries.length > 0 && <View style={styles.divider} />}
              <Pressable
                onPress={handleDocumentPick}
                disabled={busy}
                style={({ pressed }) => [
                  styles.documentRow,
                  styles.addRow,
                  (pressed || busy) && { opacity: 0.6 },
                ]}
                accessibilityRole="button"
              >
                {uploading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <MaterialCommunityIcons name="plus" size={20} color={colors.primary} />
                )}
                <View style={styles.documentBody}>
                  <Text style={styles.documentName}>
                    {replacing ? "Cambiar documento" : "Agregar documento"}
                  </Text>
                  {value.length === 0 && !!placeholder && (
                    <Text style={styles.documentMeta}>{placeholder}</Text>
                  )}
                </View>
              </Pressable>
            </>
          )}
        </View>
      )}

      {!!helperText && !readonly && (
        <Text style={[styles.hint, error && { color: colors.error }]}>{helperText}</Text>
      )}

      {!!limitHint && <Text style={[styles.hint, styles.limit]}>{limitHint}</Text>}

      {thumbnails.length > 0 && !props.onItemPress && (
        <PhotoViewer
          photos={photoUris}
          index={viewerIndex}
          onChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </View>
  );
}

/** "Tomar foto", "Agregar foto", "Documento": del tamaño de una miniatura. */
function AddTile({
  icon,
  label,
  onPress,
  disabled,
  busy,
  error,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  error?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.tile,
        error && { borderColor: colors.error },
        pressed && { backgroundColor: colors.surfaceMuted },
        disabled && !busy && { opacity: 0.5 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
    >
      {busy ? (
        <ActivityIndicator size="small" color={colors.textSecondary} />
      ) : (
        <MaterialCommunityIcons name={icon} size={22} color={colors.textSecondary} />
      )}
      <Text style={styles.tileText} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

const makeStyles = themedStyles((c) => ({
  container: {
    marginVertical: 8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceMuted,
    overflow: "hidden",
  },
  thumbPress: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  // Fijo en ambos temas: va sobre la foto, no sobre el fondo.
  thumbRemove: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  tile: {
    width: THUMB,
    height: THUMB,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: c.borderStrong,
    backgroundColor: c.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 4,
  },
  tileText: {
    fontSize: 12,
    lineHeight: 15,
    color: c.textSecondary,
    textAlign: "center",
  },
  placeholder: {
    flex: 1,
    minWidth: 140,
    fontSize: 13,
    lineHeight: 18,
    color: c.textSecondary,
  },
  documents: {
    backgroundColor: c.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: c.border,
    overflow: "hidden",
  },
  documentRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
  },
  documentMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingLeft: 14,
    paddingRight: 4,
    paddingVertical: 10,
  },
  documentBody: { flex: 1, minWidth: 0 },
  documentName: { fontSize: 15, lineHeight: 20, fontWeight: "500", color: c.text },
  documentMeta: { fontSize: 13, lineHeight: 18, color: c.textMuted, marginTop: 2 },
  documentRemove: { paddingHorizontal: 14, paddingVertical: 10 },
  addRow: { gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  divider: { height: 1, backgroundColor: c.border, marginLeft: 48 },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    color: c.textSecondary,
    marginTop: 6,
  },
  limit: {
    color: c.textMuted,
  },
}));

/** Dentro de un formulario: el campo pinta etiqueta, error y margen. */
function EmbeddedUpload(props: AppUploadProps) {
  return <AppUpload {...props} embedded />;
}

export const FormUpload = MakeForm(EmbeddedUpload);
