/**
 * Preferencias de notificaciones de la empresa o, con ?scope=location, de la
 * sucursal actual (Administración › Esta sucursal).
 *
 * Como Inicio: un grupo por área y un renglón por aviso con su interruptor;
 * debajo del nombre se lee por dónde llega y a quién. Al tocarlo se abre el
 * detalle para elegir canales y destinatarios. Antes era una tarjeta con
 * sombra por aviso, todo abierto a la vez, con chips y etiquetas en
 * mayúsculas ("CANALES", "DESTINATARIOS").
 */

import { useAllLocationsAccess } from "@/components/Administration/Users/useUserScope";
import UserAvatar from "@/components/Administration/Users/UserAvatar";
import EmptyState from "@/components/App/EmptyState";
import {
  ListGroup,
  ListGroupSkeleton,
  ListRow,
  ListSection,
  ListSectionTitle,
} from "@/components/App/ListGroup";
import FormNote from "@/components/Auth/FormNote";
import NotificationPermissionBanner from "@/components/Notifications/NotificationPermissionBanner";
import {
  fetchEligibleUsersQuietly,
  fetchNotificationPreferences,
} from "@/components/Notifications/notificationRequests";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useCallback, useLayoutEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Button, Modal, Portal, Switch } from "react-native-paper";

type EventType = App.Entities.NotificationEventType;
type Preference = App.Entities.NotificationPreference;
type ChannelKey = "channel_db" | "channel_push" | "channel_email";
type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface EligibleUser {
  id: number;
  name: string;
  email: string;
}

// ─── Catálogo de eventos ────────────────────────────────────────────────────
// La lista de eventos la manda el backend (uno por cada tipo, con valores por
// defecto si la empresa no lo ha configurado); aquí solo va cómo mostrarlos.
// `directRecipients`: avisos que van a personas concretas (sin permiso que
// filtre), por eso no tienen lista de destinatarios. `shortRecipients` es lo
// mismo en pocas palabras, para el renglón.

interface EventConfig {
  label: string;
  description: string;
  icon: IconName;
  directRecipients?: string;
  shortRecipients?: string;
}

const EVENT_CONFIG: Record<string, EventConfig> = {
  low_stock: {
    label: "Stock bajo",
    description: "Cuando un producto queda por debajo de su stock mínimo en una sucursal.",
    icon: "package-variant-remove",
  },
  inventory_adjustment: {
    label: "Ajustes de inventario",
    description: "Cuando alguien registra un ajuste de existencias (no le llega a quien lo hizo).",
    icon: "tune-variant",
  },
  inventory_count_discrepancy: {
    label: "Diferencias de conteo",
    description: "Cuando un conteo encuentra cantidades distintas al stock esperado.",
    icon: "clipboard-alert-outline",
  },
  purchase_update: {
    label: "Compras",
    description: "Cuando una compra sale en camino o se recibe.",
    icon: "truck-delivery-outline",
  },
  transfer_update: {
    label: "Transferencias",
    description: "Cuando una transferencia se aprueba, rechaza, envía, recibe o cancela.",
    icon: "swap-horizontal",
    directRecipients:
      "Llega a quien pidió la transferencia y, cuando se recibe, también a quien la envió.",
    shortRecipients: "A quien la pidió y a quien la envió",
  },
  task_event: {
    label: "Tareas",
    description: "Tarea asignada, completada, comentada, por vencer (menos de un día) y vencida.",
    icon: "clipboard-check-outline",
    directRecipients:
      "Llega a las personas de cada tarea: a quien se le asigna (asignación, por vencer, vencida, comentarios) y a quien la creó (cuando se completa o la comentan).",
    shortRecipients: "A las personas de cada tarea",
  },
  reminder: {
    label: "Recordatorios",
    description: "Cuando se acerca la fecha de un recordatorio con aviso activado y el mismo día.",
    icon: "calendar-clock",
    directRecipients: "Llega al usuario al que está asignado el recordatorio.",
    shortRecipients: "A quien tiene el recordatorio",
  },
};

// Áreas de la pantalla, en este orden. Un aviso nuevo del backend que no
// esté aquí va en «Otros».
const SECTIONS: { title: string; events: string[] }[] = [
  { title: "Inventario", events: ["low_stock", "inventory_adjustment", "inventory_count_discrepancy"] },
  { title: "Compras y transferencias", events: ["purchase_update", "transfer_update"] },
  { title: "Tareas y recordatorios", events: ["task_event", "reminder"] },
];

// Quién puede recibir los avisos por permiso, con el nombre que tiene ese
// permiso en Roles.
const PERMISSION_NAMES: Record<string, string> = {
  inventory_manage: "Inventario › Hacer ajustes",
  purchases_manage: "Compras › Recibir avisos",
};

function getEventConfig(eventType: string): EventConfig {
  return (
    EVENT_CONFIG[eventType] ?? {
      label: eventType.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()),
      description: "Tipo de aviso nuevo.",
      icon: "bell-outline",
    }
  );
}

function groupPreferences(list: Preference[]) {
  const known = new Set(SECTIONS.flatMap((s) => s.events));
  const groups = SECTIONS.map((section) => ({
    title: section.title,
    prefs: section.events
      .map((event) => list.find((p) => p.event_type === event))
      .filter((p): p is Preference => !!p),
  }));
  const others = list.filter((p) => !known.has(p.event_type));
  if (others.length) groups.push({ title: "Otros", prefs: others });
  return groups.filter((g) => g.prefs.length > 0);
}

const CHANNELS: { key: ChannelKey; label: string; description: string; icon: IconName }[] = [
  { key: "channel_db", label: "Campana", description: "En la campana de avisos de la app", icon: "bell-outline" },
  { key: "channel_push", label: "Push", description: "Al celular o al navegador, aunque no tengan la app abierta", icon: "cellphone-message" },
  { key: "channel_email", label: "Correo", description: "Al correo de cada persona", icon: "email-outline" },
];

function normalizeUsers(response: any): EligibleUser[] {
  const payload = response?.data ?? response;
  if (!Array.isArray(payload)) return [];
  return payload
    .filter((u: any) => u?.id)
    .map((u: any) => ({ id: u.id, name: u.name ?? "Usuario", email: u.email ?? "" }));
}

function errorMessage(error: any, fallback: string) {
  const message = error?.response?.data?.message;
  return typeof message === "string" && message.trim() ? message : fallback;
}

/** ["Ana López", "Luis Ramírez", "Marta Díaz"] → "Ana López, Luis Ramírez y Marta Díaz". */
function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

/** ["Campana", "Push", "Correo"] → "Campana, push y correo". */
function joinWords(words: string[]): string {
  return joinList(words.map((w, i) => (i === 0 ? w : w.charAt(0).toLowerCase() + w.slice(1))));
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** Por dónde llega, en pocas palabras ("" si no hay canales). */
function channelsText(pref: Preference): string {
  return joinWords(CHANNELS.filter((c) => pref[c.key]).map((c) => c.label));
}

/**
 * A quién le llega, en pocas palabras. null = a nadie (lista vacía o todos
 * los elegidos ya no tienen el permiso).
 */
function recipientsText(pref: Preference, eligible: EligibleUser[] | null): string | null {
  if (!pref.permission_name) return getEventConfig(pref.event_type).shortRecipients ?? "A las personas involucradas";
  const allowed = pref.allowed_user_ids;
  if (eligible === null) {
    // Sin permiso para ver a los usuarios: solo lo que dice la preferencia.
    if (allowed === null) return "Todos con permiso";
    return allowed.length ? `${allowed.length} ${plural(allowed.length, "persona elegida", "personas elegidas")}` : null;
  }
  if (allowed === null) return `Todos con permiso (${eligible.length})`;
  const chosen = eligible.filter((u) => allowed.includes(u.id));
  if (chosen.length === 0) return null;
  if (chosen.length <= 2) return joinList(chosen.map((u) => u.name));
  return `${chosen[0].name} y ${chosen.length - 1} más`;
}

// ─── Pantalla ───────────────────────────────────────────────────────────────

export default function NotificationPreferencesScreen() {
  const alerts = useAlerts();
  const styles = useThemedStyles(makeStyles);
  const { hasPermission, location } = useAuth();
  const navigation = useNavigation();
  // ?scope=location: los avisos de la sucursal actual (Administración › Esta
  // sucursal). Cada aviso usa el de la empresa hasta que se cambia aquí.
  const { scope } = useLocalSearchParams<{ scope?: string }>();
  const branchScope = scope === "location" ? ("location" as const) : undefined;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: branchScope ? `Notificaciones · ${location?.name ?? "sucursal"}` : "Preferencias de notificaciones",
    });
  }, [navigation, branchScope, location?.name]);
  // GET pide notifications_list; cambiar algo (y ver los usuarios elegibles)
  // pide notifications_manage. La configuración de la empresa además pide
  // entrar a todas las sucursales (si no, el servidor responde
  // company_scope_forbidden): para los demás es de solo lectura.
  const allLocations = useAllLocationsAccess();
  const companyLocked = !branchScope && !allLocations;
  const canManage = hasPermission("notifications_manage") && !companyLocked;

  const [prefs, setPrefs] = useState<Preference[]>([]);
  // Usuarios elegibles por permiso (varios eventos comparten permiso).
  const [eligibleByPermission, setEligibleByPermission] = useState<
    Record<string, EligibleUser[]>
  >({});
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState<EventType | null>(null);

  // Aviso abierto en el detalle y guardado de sus destinatarios.
  const [openEvent, setOpenEvent] = useState<EventType | null>(null);
  const [usersSaving, setUsersSaving] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      setLoadError(null);
      // El error se muestra en la pantalla (loadError): sin aviso global.
      const prefsRes = await fetchNotificationPreferences(branchScope);
      const list: Preference[] = Array.isArray(prefsRes?.data)
        ? prefsRes.data
        : Array.isArray(prefsRes)
          ? prefsRes
          : [];
      setPrefs(list);
      setLoading(false);

      if (!canManage) return;

      // Una consulta por permiso (inventory_manage, purchases_manage…), no
      // por evento. Antes se listaban todos los usuarios de la empresa,
      // aunque sin el permiso nunca reciben el aviso.
      const permissions = Array.from(
        new Set(list.map((p) => p.permission_name).filter(Boolean)),
      );
      setLoadingUsers(true);
      const entries = await Promise.all(
        permissions.map(async (permission) => {
          const pref = list.find((p) => p.permission_name === permission)!;
          try {
            const response = await fetchEligibleUsersQuietly(
              pref.event_type,
              branchScope ? { scope: branchScope } : undefined,
            );
            return [permission, normalizeUsers(response)] as const;
          } catch {
            return null;
          }
        }),
      );
      setEligibleByPermission(
        Object.fromEntries(
          entries.filter((entry): entry is NonNullable<typeof entry> => entry !== null),
        ),
      );
    } catch (error: any) {
      setLoadError(
        errorMessage(
          error,
          error?.response?.status === 403
            ? "No tienes permiso para ver las preferencias de notificaciones."
            : "No se pudieron cargar las preferencias.",
        ),
      );
    } finally {
      setLoading(false);
      setLoadingUsers(false);
    }
  }, [canManage, branchScope]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll]),
  );

  const savePref = async (eventType: EventType, patch: Partial<Preference>) => {
    const previous = prefs;
    // En la sucursal, cambiar algo la deja con su propia configuración.
    const customized = branchScope ? { is_customized: true } : {};
    setPrefs((current) =>
      current.map((p) => (p.event_type === eventType ? { ...p, ...patch, ...customized } : p)),
    );
    setSaving(eventType);
    try {
      await Services.notificationPreferences.update(eventType, patch, branchScope);
    } catch (error) {
      // Se regresa al valor anterior: el switch no debe quedar mintiendo.
      setPrefs(previous);
      alerts.error(errorMessage(error, "Error al guardar la preferencia"));
    } finally {
      setSaving(null);
    }
  };

  // Destinatarios elegidos en el detalle. Devuelve si se guardaron.
  const saveUsers = async (eventType: EventType, ids: number[] | null) => {
    setUsersSaving(true);
    try {
      await Services.notificationPreferences.update(eventType, { allowed_user_ids: ids }, branchScope);
      setPrefs((current) =>
        current.map((p) =>
          p.event_type === eventType
            ? { ...p, allowed_user_ids: ids, ...(branchScope ? { is_customized: true } : {}) }
            : p,
        ),
      );
      alerts.success("Destinatarios guardados");
      return true;
    } catch (error) {
      alerts.error(errorMessage(error, "Error al guardar los destinatarios"));
      return false;
    } finally {
      setUsersSaving(false);
    }
  };

  const handleReset = async () => {
    const confirmed = await alerts.confirm(
      branchScope
        ? "¿Usar en todos los avisos de esta sucursal la configuración de la empresa?"
        : "¿Restablecer todas las preferencias a los valores predeterminados?",
      {
        title: branchScope ? "Usar la configuración de la empresa" : "Restablecer preferencias",
        okText: branchScope ? "Usar la de la empresa" : "Restablecer",
        cancelText: "Cancelar",
      }
    );
    if (!confirmed) return;
    try {
      await Services.notificationPreferences.reset(branchScope);
      alerts.success(branchScope ? "La sucursal usa la configuración de la empresa" : "Preferencias restablecidas");
      loadAll();
    } catch (error) {
      alerts.error(errorMessage(error, "Error al restablecer las preferencias"));
    }
  };

  // Un aviso de la sucursal vuelve a la configuración de la empresa.
  const handleRestore = async (eventType: EventType) => {
    setSaving(eventType);
    try {
      await Services.notificationPreferences.restore(eventType, branchScope);
      await loadAll();
    } catch (error) {
      alerts.error(errorMessage(error, "No se pudo volver a la configuración de la empresa"));
    } finally {
      setSaving(null);
    }
  };

  const anyCustomized = prefs.some((p) => p.is_customized);
  const eligibleFor = (pref: Preference): EligibleUser[] | null =>
    pref.permission_name ? eligibleByPermission[pref.permission_name] ?? null : null;
  const openPref = openEvent ? prefs.find((p) => p.event_type === openEvent) : undefined;

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <NotificationPermissionBanner />

        {loading ? (
          <ListGroupSkeleton rows={7} />
        ) : loadError ? (
          <EmptyState
            icon={loadError.includes("permiso") ? "lock-outline" : "cloud-off-outline"}
            title={loadError}
            actionLabel="Reintentar"
            onAction={loadAll}
          />
        ) : (
          <>
            <Text style={styles.intro}>
              {branchScope
                ? `Avisos de lo que pasa en ${location?.name ?? "esta sucursal"}. Cada aviso funciona como en la empresa hasta que lo cambias aquí; los reciben las personas de esta sucursal.`
                : "Qué avisos manda la app, por dónde llegan y a quién. Cada sucursal puede cambiarlos en Administración › Esta sucursal."}
              {canManage ? " Toca un aviso para elegir sus canales y destinatarios." : ""}
            </Text>

            {!canManage && (
              <FormNote icon="lock-outline">
                {companyLocked && hasPermission("notifications_manage")
                  ? `Solo lectura: la configuración de la empresa la cambia quien entra a todas las sucursales. Los avisos de ${location?.name ?? "tu sucursal"} están en Administración › Esta sucursal.`
                  : "Solo lectura: para cambiarlas hace falta el permiso «Notificaciones › Configurar avisos»."}
              </FormNote>
            )}

            {groupPreferences(prefs).map((group) => (
              <ListSection key={group.title} title={group.title}>
                <ListGroup>
                  {group.prefs.map((pref) => (
                    <EventRow
                      key={pref.event_type}
                      pref={pref}
                      eligible={eligibleFor(pref)}
                      branch={!!branchScope}
                      disabled={!canManage || saving === pref.event_type}
                      onToggle={(value) => savePref(pref.event_type, { is_active: value })}
                      onOpen={() => setOpenEvent(pref.event_type)}
                    />
                  ))}
                </ListGroup>
              </ListSection>
            ))}

            {canManage && (!branchScope || anyCustomized) && (
              <ListGroup>
                <ListRow
                  icon="restore"
                  title={
                    branchScope
                      ? "Usar la configuración de la empresa en todo"
                      : "Restablecer valores predeterminados"
                  }
                  subtitle={
                    branchScope
                      ? "Quita los cambios de esta sucursal en todos los avisos"
                      : "Todos los avisos vuelven a como venían de fábrica"
                  }
                  onPress={handleReset}
                  chevron={false}
                />
              </ListGroup>
            )}
          </>
        )}
      </ScrollView>

      {openPref && (
        <EventSheet
          key={openPref.event_type}
          pref={openPref}
          eligible={eligibleFor(openPref)}
          loadingUsers={loadingUsers}
          canManage={canManage}
          saving={saving === openPref.event_type}
          usersSaving={usersSaving}
          branch={!!branchScope}
          onChange={(patch) => savePref(openPref.event_type, patch)}
          onSaveUsers={(ids) => saveUsers(openPref.event_type, ids)}
          onRestore={() => handleRestore(openPref.event_type)}
          onClose={() => setOpenEvent(null)}
        />
      )}
    </View>
  );
}

// ─── Renglón de un aviso ────────────────────────────────────────────────────

function EventRow({
  pref,
  eligible,
  branch,
  disabled,
  onToggle,
  onOpen,
}: {
  pref: Preference;
  /** null = no se pudo saber (sin permiso para consultarlo o aún cargando). */
  eligible: EligibleUser[] | null;
  branch: boolean;
  disabled: boolean;
  onToggle: (value: boolean) => void;
  onOpen: () => void;
}) {
  const { colors } = useTheme();
  const config = getEventConfig(pref.event_type);
  const channels = channelsText(pref);
  const recipients = recipientsText(pref, eligible);

  let subtitle = "Apagado: no se manda";
  let warning: string | undefined;
  if (pref.is_active) {
    subtitle = [channels, recipients].filter(Boolean).join(" · ");
    if (!channels && !recipients) warning = "Sin canales ni destinatarios: no le llega a nadie";
    else if (!channels) warning = "Sin canales: no le llega a nadie";
    else if (!recipients) warning = "Sin destinatarios: no le llega a nadie";
  }

  return (
    <ListRow
      icon={config.icon}
      iconColor={pref.is_active ? undefined : colors.textMuted}
      title={config.label}
      subtitle={subtitle || undefined}
      warning={warning}
      meta={branch ? (pref.is_customized ? "Cambiado en esta sucursal" : "Igual que en la empresa") : undefined}
      onPress={onOpen}
      accessibilityLabel={`${config.label}: ${pref.is_active ? subtitle : "apagado"}`}
      trailing={
        <Switch
          value={pref.is_active}
          onValueChange={onToggle}
          disabled={disabled}
          color={colors.primary}
          accessibilityLabel={`Enviar ${config.label.toLowerCase()}`}
        />
      }
    />
  );
}

// ─── Detalle de un aviso: canales y destinatarios ───────────────────────────

function EventSheet({
  pref,
  eligible,
  loadingUsers,
  canManage,
  saving,
  usersSaving,
  branch,
  onChange,
  onSaveUsers,
  onRestore,
  onClose,
}: {
  pref: Preference;
  eligible: EligibleUser[] | null;
  loadingUsers: boolean;
  canManage: boolean;
  saving: boolean;
  usersSaving: boolean;
  branch: boolean;
  onChange: (patch: Partial<Preference>) => void;
  onSaveUsers: (ids: number[] | null) => Promise<boolean>;
  onRestore: () => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const config = getEventConfig(pref.event_type);
  // Detalle o la lista para elegir destinatarios.
  const [step, setStep] = useState<"detail" | "recipients">("detail");
  const disabled = !canManage || saving;
  const byPermission = Boolean(pref.permission_name);
  const permissionName = PERMISSION_NAMES[pref.permission_name];
  const permissionHint = permissionName
    ? `Solo pueden recibirlo quienes tienen el permiso «${permissionName}».`
    : "Solo pueden recibirlo quienes tienen el permiso que pide este aviso.";
  const recipients = recipientsText(pref, eligible);
  const noChannels = !pref.channel_db && !pref.channel_push && !pref.channel_email;
  const canPickUsers = canManage && eligible !== null;

  return (
    <Portal>
      <Modal visible onDismiss={onClose} contentContainerStyle={styles.sheet}>
        {step === "recipients" && eligible ? (
          <RecipientsPicker
            title={config.label}
            hint={permissionHint}
            allUsers={eligible}
            currentIds={pref.allowed_user_ids}
            saving={usersSaving}
            onCancel={() => setStep("detail")}
            onSave={async (ids) => {
              if (await onSaveUsers(ids)) setStep("detail");
            }}
          />
        ) : (
          <>
            <View style={styles.sheetHeader}>
              <MaterialCommunityIcons name={config.icon} size={22} color={colors.textSecondary} />
              <Text style={styles.sheetTitle} accessibilityRole="header">
                {config.label}
              </Text>
            </View>
            <Text style={styles.sheetText}>{config.description}</Text>
            {!canManage && (
              <FormNote icon="lock-outline">Solo lectura: no puedes cambiar este aviso.</FormNote>
            )}

            <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetBody}>
              <ListGroup>
                <ListRow
                  icon={pref.is_active ? "bell-ring-outline" : "bell-off-outline"}
                  title="Enviar este aviso"
                  subtitle={pref.is_active ? undefined : "Apagado: no le llega a nadie"}
                  chevron={false}
                  onPress={disabled ? undefined : () => onChange({ is_active: !pref.is_active })}
                  trailing={
                    <Switch
                      value={pref.is_active}
                      onValueChange={(value) => onChange({ is_active: value })}
                      disabled={disabled}
                      color={colors.primary}
                      accessibilityLabel="Enviar este aviso"
                    />
                  }
                />
              </ListGroup>

              {pref.is_active && (
                <View style={styles.block}>
                  <ListSectionTitle title="Por dónde llega" />
                  <ListGroup>
                    {CHANNELS.map((channel) => {
                      const on = pref[channel.key];
                      return (
                        <ListRow
                          key={channel.key}
                          icon={channel.icon}
                          title={channel.label}
                          subtitle={channel.description}
                          chevron={false}
                          onPress={disabled ? undefined : () => onChange({ [channel.key]: !on } as Partial<Preference>)}
                          trailing={
                            <Switch
                              value={on}
                              onValueChange={(value) => onChange({ [channel.key]: value } as Partial<Preference>)}
                              disabled={disabled}
                              color={colors.primary}
                              accessibilityLabel={channel.label}
                            />
                          }
                        />
                      );
                    })}
                  </ListGroup>
                  {noChannels && (
                    <Text style={styles.warning}>Sin canales: este aviso no le llega a nadie.</Text>
                  )}
                </View>
              )}

              {pref.is_active && (
                <View style={styles.block}>
                  <ListSectionTitle title="Quién lo recibe" />
                  <ListGroup>
                    {!byPermission ? (
                      <ListRow
                        icon="account-arrow-right-outline"
                        title={config.shortRecipients ?? "A las personas involucradas"}
                        subtitle={config.directRecipients ?? "Este aviso se envía directamente a las personas involucradas."}
                        alignTop
                        chevron={false}
                      />
                    ) : (
                      <ListRow
                        icon="account-group-outline"
                        title={recipients ?? "Nadie"}
                        subtitle={
                          loadingUsers && eligible === null
                            ? "Cargando quiénes pueden recibirlo…"
                            : recipients === null
                              ? "Sin destinatarios: este aviso no le llega a nadie."
                              : pref.allowed_user_ids === null
                                ? "También a quien reciba el permiso después."
                                : undefined
                        }
                        onPress={canPickUsers ? () => setStep("recipients") : undefined}
                        chevron={canPickUsers}
                        accessibilityLabel={canPickUsers ? `Elegir quién recibe ${config.label.toLowerCase()}` : undefined}
                      />
                    )}
                  </ListGroup>
                  {byPermission && <Text style={styles.hint}>{permissionHint}</Text>}
                </View>
              )}

              {branch && (
                <View style={styles.block}>
                  <ListSectionTitle title="En esta sucursal" />
                  <ListGroup>
                    <ListRow
                      icon={pref.is_customized ? "store-edit-outline" : "link-variant"}
                      title={pref.is_customized ? "Cambiado en esta sucursal" : "Igual que en la empresa"}
                      subtitle={
                        pref.is_customized
                          ? canManage
                            ? "Toca para volver a usar la configuración de la empresa"
                            : "No sigue la configuración de la empresa"
                          : "Si lo cambias aquí, deja de seguir a la empresa"
                      }
                      onPress={pref.is_customized && canManage && !saving ? onRestore : undefined}
                      chevron={false}
                      trailing={
                        saving ? <ActivityIndicator size="small" color={colors.primary} /> : undefined
                      }
                    />
                  </ListGroup>
                </View>
              )}
            </ScrollView>

            <Button mode="text" onPress={onClose}>
              Listo
            </Button>
          </>
        )}
      </Modal>
    </Portal>
  );
}

// ─── Elegir destinatarios ───────────────────────────────────────────────────

function RecipientsPicker({
  title,
  hint,
  allUsers,
  currentIds,
  saving,
  onSave,
  onCancel,
}: {
  title: string;
  hint: string;
  allUsers: EligibleUser[];
  currentIds: number[] | null; // null = todos
  saving: boolean;
  onSave: (ids: number[] | null) => void;
  onCancel: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [search, setSearch] = useState("");
  // Se monta cada vez que se abre: null → todos seleccionados.
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(currentIds ?? allUsers.map((u) => u.id))
  );

  const q = search.trim().toLowerCase();
  const filtered = allUsers.filter(
    (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  );

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Solo cuentan los que siguen siendo elegibles (un usuario pudo perder el
  // permiso desde que se guardó la lista).
  const selectedEligible = allUsers.filter((u) => selected.has(u.id)).length;
  const allChecked = selectedEligible === allUsers.length;

  const handleSave = () => {
    const ids = allUsers.filter((u) => selected.has(u.id)).map((u) => u.id);
    // null = todos los que tengan el permiso (incluidos los que se agreguen después)
    onSave(ids.length === allUsers.length ? null : ids);
  };

  return (
    <>
      <View style={styles.sheetHeader}>
        <Pressable
          onPress={onCancel}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          disabled={saving}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textSecondary} />
        </Pressable>
        <Text style={styles.sheetTitle} accessibilityRole="header" numberOfLines={2}>
          Quién recibe «{title}»
        </Text>
      </View>
      <Text style={styles.sheetText}>{hint}</Text>

      <View style={styles.searchBox}>
        <MaterialCommunityIcons name="magnify" size={18} color={colors.textMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por nombre o correo"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Buscar persona"
        />
      </View>

      <View style={styles.bulkRow}>
        <Text style={styles.hint}>
          {selectedEligible} de {allUsers.length} {plural(allUsers.length, "elegido", "elegidos")}
        </Text>
        <Pressable
          onPress={() => setSelected(new Set(allChecked ? [] : allUsers.map((u) => u.id)))}
          hitSlop={8}
          accessibilityRole="button"
        >
          <Text style={styles.link}>{allChecked ? "Quitar todos" : "Elegir todos"}</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled">
        {filtered.length === 0 ? (
          <Text style={styles.empty}>Nadie coincide con «{search.trim()}».</Text>
        ) : (
          <ListGroup inset={58}>
            {filtered.map((user) => {
              const checked = selected.has(user.id);
              return (
                <Pressable
                  key={user.id}
                  onPress={() => toggle(user.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  accessibilityLabel={user.name}
                  style={({ pressed }) => [styles.userRow, pressed && styles.pressed]}
                >
                  <UserAvatar name={user.name} size={32} />
                  <View style={styles.userBody}>
                    <Text style={styles.userName} numberOfLines={1}>
                      {user.name}
                    </Text>
                    {!!user.email && (
                      <Text style={styles.userEmail} numberOfLines={1}>
                        {user.email}
                      </Text>
                    )}
                  </View>
                  <MaterialCommunityIcons
                    name={checked ? "checkbox-marked" : "checkbox-blank-outline"}
                    size={22}
                    color={checked ? colors.primary : colors.borderStrong}
                  />
                </Pressable>
              );
            })}
          </ListGroup>
        )}
      </ScrollView>

      {selectedEligible === 0 && (
        <FormNote tone="warning">Sin nadie elegido, este aviso no le llega a nadie.</FormNote>
      )}

      <View style={styles.actions}>
        <Button mode="outlined" onPress={onCancel} style={styles.actionCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button
          mode="contained"
          onPress={handleSave}
          style={styles.actionSave}
          loading={saving}
          disabled={saving}
        >
          Guardar
        </Button>
      </View>
    </>
  );
}

const makeStyles = themedStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.background },
  scroll: { flex: 1 },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 22,
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
  },
  intro: { fontSize: 14, lineHeight: 20, color: c.textSecondary },
  hint: { fontSize: 13, lineHeight: 18, color: c.textSecondary },
  warning: { fontSize: 13, lineHeight: 18, color: c.warning },
  link: { fontSize: 14, lineHeight: 20, fontWeight: "600", color: c.primary },
  empty: { fontSize: 14, lineHeight: 20, color: c.textSecondary, textAlign: "center", paddingVertical: 16 },
  block: { gap: 8 },

  // Detalle (hoja)
  sheet: {
    alignSelf: "center",
    width: "94%",
    maxWidth: 560,
    maxHeight: "88%",
    backgroundColor: c.background,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  sheetTitle: { flex: 1, fontSize: 18, lineHeight: 24, fontWeight: "700", color: c.text },
  sheetText: { fontSize: 14, lineHeight: 20, color: c.textSecondary },
  sheetScroll: { flexGrow: 0 },
  sheetBody: { gap: 18, paddingTop: 4 },

  // Destinatarios
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    color: c.text,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
  },
  bulkRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pressed: { backgroundColor: c.surfaceMuted },
  userBody: { flex: 1, minWidth: 0 },
  userName: { fontSize: 15, lineHeight: 20, fontWeight: "500", color: c.text },
  userEmail: { fontSize: 13, lineHeight: 18, color: c.textSecondary },
  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
  actionCancel: { flex: 1 },
  actionSave: { flex: 1.4 },
}));
