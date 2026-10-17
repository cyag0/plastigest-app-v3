/**
 * Un producto dentro del registro de ajustes, como renglón de un ListGroup
 * (antes era una tarjeta con sombra "Producto #1"): nombre y existencia,
 * "¿Qué pasó?", la cantidad con su unidad y, en vivo, cuánto queda o por
 * qué no se puede. Nota y fotos van plegadas; para un robo o un daño la foto
 * se abre sola.
 */

import AppUpload, { type UploadedFile } from "@/components/Form/AppUpload";
import QuantityField from "@/components/Production/QuantityField";
import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import { formatQuantity } from "@/utils/format";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Image, Platform, Pressable, Text, TextInput, View } from "react-native";
import { Menu } from "react-native-paper";
import { MANUAL_REASONS, PHOTO_REASONS, REASONS, type Direction, type ReasonCode } from "./adjustmentFormat";
import {
  captureAbbr,
  countQuestion,
  MAX_PHOTOS,
  type DraftLine,
  type LineCheck,
  type LineField,
} from "./adjustmentLine";
import ChoiceChips from "./ChoiceChips";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface Props {
  line: DraftLine;
  check: LineCheck;
  /** Ya se intentó registrar: se marcan también los datos que faltan. */
  showProblems: boolean;
  onChange: (patch: Partial<DraftLine>) => void;
  onRemove: () => void;
}

const REASON_OPTIONS = MANUAL_REASONS.map((code) => ({ value: code, label: REASONS[code].answer }));

const DIRECTION_OPTIONS: { value: Direction; label: string }[] = [
  { value: "out", label: "Sale (resta)" },
  { value: "in", label: "Entra (suma)" },
];

export default function AdjustmentLineRow({ line, check, showProblems, onChange, onRemove }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [unitMenu, setUnitMenu] = useState(false);

  const problem = check.problem && (check.problem.live || showProblems) ? check.problem : null;
  const problemAt = (field: LineField) => (problem?.field === field ? problem.message : null);
  const isCount = line.reason === "count_diff";
  const canChooseUnit = line.units.length > 1;

  const addPhotos = (files: UploadedFile[]) => onChange({ photos: [...line.photos, ...files].slice(0, MAX_PHOTOS) });

  return (
    <View style={styles.row}>
      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={styles.title} numberOfLines={2}>
            {line.name}
          </Text>
          <Text style={styles.meta}>
            {[line.code, `Hay ${formatQuantity(line.stock, line.unitAbbr)}`].filter(Boolean).join(" · ")}
          </Text>
        </View>
        <Pressable
          onPress={onRemove}
          hitSlop={10}
          style={styles.remove}
          accessibilityRole="button"
          accessibilityLabel={`Quitar ${line.name}`}
        >
          <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.block}>
        <Text style={styles.question}>¿Qué pasó?</Text>
        <ChoiceChips<ReasonCode>
          options={REASON_OPTIONS}
          value={line.reason}
          accessibilityLabel={`Qué pasó con ${line.name}`}
          onChange={(reason) =>
            onChange({
              reason,
              direction: reason === "other" ? line.direction : null,
              // Entre "cuánto hay" (conteo) y "cuánto se movió" el número
              // significa otra cosa: se borra para no registrar 37 dañados
              // donde se escribió que había 37.
              ...((reason === "count_diff") !== isCount ? { qty: "" } : null),
              // Para un robo o un daño se sugiere la foto.
              showPhotos: line.showPhotos || PHOTO_REASONS.includes(reason),
            })
          }
        />
        {!!problemAt("reason") && <Text style={styles.error}>{problemAt("reason")}</Text>}
      </View>

      {line.reason === "other" && (
        <View style={styles.block}>
          <Text style={styles.question}>¿Sale o entra?</Text>
          <ChoiceChips<Direction>
            options={DIRECTION_OPTIONS}
            value={line.direction}
            onChange={(direction) => onChange({ direction })}
            accessibilityLabel={`¿Sale o entra? ${line.name}`}
          />
          {!!problemAt("direction") && <Text style={styles.error}>{problemAt("direction")}</Text>}
        </View>
      )}

      <View style={styles.block}>
        <View style={styles.capture}>
          <Text style={styles.captureLabel}>{isCount ? countQuestion(line) : "Cantidad"}</Text>
          <QuantityField
            value={line.qty}
            onChangeText={(qty) => onChange({ qty })}
            // Con varias unidades, la unidad va en el selector de al lado.
            unit={canChooseUnit ? null : line.unitAbbr}
            invalid={!!problemAt("quantity")}
            placeholder="0"
            accessibilityLabel={isCount ? `${countQuestion(line)} de ${line.name}` : `Cantidad de ${line.name}`}
          />
          {canChooseUnit && (
            <Menu
              visible={unitMenu}
              onDismiss={() => setUnitMenu(false)}
              contentStyle={{ backgroundColor: colors.surface }}
              anchor={
                <Pressable
                  onPress={() => setUnitMenu(true)}
                  style={({ pressed }) => [styles.unitButton, pressed && { backgroundColor: colors.surfaceMuted }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Unidad: ${captureAbbr(line)}. Cambiar`}
                >
                  <Text style={styles.unitText}>{captureAbbr(line)}</Text>
                  <MaterialCommunityIcons name="chevron-down" size={16} color={colors.textMuted} />
                </Pressable>
              }
            >
              {line.units.map((unit) => (
                <Menu.Item
                  key={unit.id}
                  title={`${unit.name} (${unit.abbreviation})`}
                  leadingIcon={unit.id === line.captureUnitId ? "check" : undefined}
                  titleStyle={{ color: colors.text }}
                  onPress={() => {
                    setUnitMenu(false);
                    onChange({ captureUnitId: unit.id });
                  }}
                />
              ))}
            </Menu>
          )}
        </View>
        {problemAt("quantity") ? (
          <Text style={styles.error}>{problemAt("quantity")}</Text>
        ) : check.summary ? (
          <Text style={styles.summary}>{check.summary}</Text>
        ) : null}
      </View>

      {line.showNotes && (
        <View style={styles.block}>
          <Text style={styles.question}>Nota (opcional)</Text>
          <TextInput
            value={line.notes}
            onChangeText={(notes) => onChange({ notes })}
            placeholder="Por ejemplo: se rompieron al bajarlos del camión"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel={`Nota de ${line.name}`}
            multiline
            maxLength={1000}
            style={styles.notes}
          />
        </View>
      )}

      {line.showPhotos && (
        <View style={styles.block}>
          <Text style={styles.question}>Fotos (opcional)</Text>
          <View style={styles.photos}>
            {line.photos.map((photo, index) => (
              <View key={`${photo.uri}-${index}`} style={styles.thumbWrap}>
                <Image source={{ uri: photo.uri }} style={styles.thumb} resizeMode="cover" />
                <Pressable
                  onPress={() => onChange({ photos: line.photos.filter((_, i) => i !== index) })}
                  hitSlop={6}
                  style={styles.thumbRemove}
                  accessibilityRole="button"
                  accessibilityLabel="Quitar foto"
                >
                  <MaterialCommunityIcons name="close" size={14} color="#FFFFFF" />
                </Pressable>
              </View>
            ))}
            {line.photos.length < MAX_PHOTOS && (
              // Una foto a la vez; la lista la lleva el renglón (y el máximo).
              <View style={styles.uploadSlot}>
                <AppUpload
                  accept="images"
                  value={[]}
                  multiple={false}
                  maxFiles={1}
                  showPreview={false}
                  onChange={addPhotos}
                  renderButtons={({ handleCameraPick, handleImagePick, uploading }) => (
                    <View style={styles.photoButtons}>
                      {Platform.OS !== "web" && (
                        <PhotoTile
                          icon="camera-outline"
                          label="Tomar foto"
                          onPress={handleCameraPick}
                          busy={uploading}
                        />
                      )}
                      <PhotoTile
                        icon="image-plus-outline"
                        label={Platform.OS === "web" ? "Subir foto" : "Galería"}
                        onPress={handleImagePick}
                        busy={uploading}
                      />
                    </View>
                  )}
                />
              </View>
            )}
          </View>
        </View>
      )}

      {(!line.showNotes || !line.showPhotos) && (
        <View style={styles.extras}>
          {!line.showNotes && (
            <ExtraLink icon="note-text-outline" label="Agregar nota" onPress={() => onChange({ showNotes: true })} />
          )}
          {!line.showPhotos && (
            <ExtraLink icon="camera-outline" label="Agregar foto" onPress={() => onChange({ showPhotos: true })} />
          )}
        </View>
      )}
    </View>
  );
}

function ExtraLink({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.extra, pressed && { opacity: 0.6 }]}
      accessibilityRole="button"
    >
      <MaterialCommunityIcons name={icon} size={16} color={colors.primary} />
      <Text style={styles.extraText}>{label}</Text>
    </Pressable>
  );
}

function PhotoTile({
  icon,
  label,
  onPress,
  busy,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  busy?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [styles.tile, (pressed || busy) && { opacity: 0.6 }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <MaterialCommunityIcons name={icon} size={20} color={colors.textSecondary} />
      <Text style={styles.tileText} numberOfLines={1}>
        {busy ? "…" : label}
      </Text>
    </Pressable>
  );
}

const THUMB = 64;

const makeStyles = themedStyles((c) => ({
  row: { paddingHorizontal: 14, paddingVertical: 14, gap: 14 },
  head: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  headText: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, lineHeight: 20, fontWeight: "600", color: c.text },
  meta: { fontSize: 13, lineHeight: 18, color: c.textSecondary, marginTop: 2 },
  remove: { paddingTop: 1 },
  block: { gap: 8 },
  question: { fontSize: 13, lineHeight: 18, fontWeight: "600", color: c.textSecondary },
  capture: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  captureLabel: { fontSize: 14, lineHeight: 20, fontWeight: "500", color: c.textSecondary, marginRight: 2 },
  unitButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    height: 44,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.surface,
  },
  unitText: { fontSize: 15, fontWeight: "500", color: c.text },
  summary: { fontSize: 13, lineHeight: 18, color: c.textSecondary },
  error: { fontSize: 13, lineHeight: 18, color: c.error },
  notes: {
    minHeight: 72,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: c.text,
    textAlignVertical: "top",
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null),
  },
  photos: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  thumbWrap: { width: THUMB, height: THUMB },
  thumb: { width: THUMB, height: THUMB, borderRadius: 10, backgroundColor: c.surfaceMuted },
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
  // AppUpload trae margen arriba y abajo: se compensa para alinear las fichas.
  uploadSlot: { marginVertical: -8 },
  photoButtons: { flexDirection: "row", gap: 8 },
  tile: {
    width: THUMB + 8,
    height: THUMB,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: c.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingHorizontal: 4,
  },
  tileText: { fontSize: 11, lineHeight: 14, color: c.textSecondary },
  extras: { flexDirection: "row", flexWrap: "wrap", columnGap: 18, rowGap: 8 },
  extra: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 2 },
  extraText: { fontSize: 14, fontWeight: "600", color: c.primary },
}));
