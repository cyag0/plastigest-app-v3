/**
 * Dashboard PlastiGest v2 — SaaS 2025.
 *
 * Estructura en 4 niveles:
 * 1. Bienvenida
 * 2. KPIs (Ventas hoy, Compras hoy, Órdenes activas, Tareas pendientes)
 * 3. Accesos rápidos (6 módulos prioritarios, cards monocromas)
 * 4. Tareas pendientes (filas compactas de 64px)
 *
 * Responsive: 4 cols en lg+, 2x2 en md-, sidebar permanente en
 * md+ y modal en xs/sm. Hook useResponsive para breakpoints.
 */

import EmptyState from "@/components/App/EmptyState";
import SectionHeader from "@/components/App/SectionHeader";
import NotificationPermissionBanner from "@/components/Notifications/NotificationPermissionBanner";
import KpiCard from "@/components/Dashboard/KpiCard";
import QuickAccessCard from "@/components/Dashboard/QuickAccessCard";
import TaskRow, { TaskRowStatus } from "@/components/Dashboard/TaskRow";
import { tokens } from "@/constants/tokens";
import { useAuth } from "@/contexts/AuthContext";
import { useResponsive } from "@/hooks/useResponsive";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  View,
} from "react-native";
import Services from "@/utils/services";

interface QuickAccess {
  key: string;
  label: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  link: string;
}

// Reducido de 10 a 6 accesos prioritarios. El resto se accede
// desde el sidebar o desde la vista "Ver todos" en
// app/(tabs)/home/all-modules.tsx.
const QUICK_ACCESS: QuickAccess[] = [
  {
    key: "produccion",
    label: "Producción",
    description: "Órdenes de producción",
    icon: "factory",
    link: "/(tabs)/home/production",
  },
  {
    key: "compras",
    label: "Compras",
    description: "Compras a proveedores",
    icon: "cart-outline",
    link: "/(tabs)/home/purchases",
  },
  {
    key: "ventas",
    label: "Ventas",
    description: "Ventas a clientes",
    icon: "cash-register",
    link: "/(tabs)/home/sales",
  },
/*   {
    key: "pedidos",
    label: "Pedidos",
    description: "Órdenes de venta",
    icon: "clipboard-list-outline",
    link: "/(tabs)/home/sales-orders",
  }, */
  {
    key: "transferencias",
    label: "Transferencias",
    description: "Entre sucursales",
    icon: "swap-horizontal",
    link: "/(tabs)/home/transfers-menu",
  },
  {
    key: "ajustes",
    label: "Ajustes",
    description: "Mermas y correcciones",
    icon: "clipboard-edit-outline",
    link: "/(tabs)/home/adjustment",
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const auth = useAuth();
  const { selectedLocation } = useSelectedLocation();
  const { isMobile } = useResponsive();

  const styles = useThemedStyles((c) => ({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    scroll: {
      flex: 1,
    },
    content: {
      gap: 24,
    },
    contentDesktop: {
      padding: 24,
      maxWidth: 1280,
      alignSelf: "center",
      width: "100%",
    },
    contentMobile: {
      padding: 16,
    },
    welcome: {
      marginTop: 4,
    },
    welcomeTitle: {
      ...tokens.typography.h1,
      color: c.text,
    },
    welcomeSubtitle: {
      ...tokens.typography.bodySm,
      color: c.textSecondary,
      marginTop: 4,
    },
    kpiStrip: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    quickGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    taskList: {
      gap: 8,
    },
    tasksLoading: {
      padding: 32,
      alignItems: "center",
    },
    tasksEmpty: {
      paddingVertical: 8,
    },
    loadingText: {
      ...tokens.typography.body,
      color: c.textMuted,
    },
  }));

  // Estado de KPIs
  const [kpis, setKpis] = useState<{
    ventasHoy: number;
    comprasHoy: number;
    ordenesActivas: number;
    tareasPendientes: number;
    ventasDelta: number | null;
    comprasDelta: number | null;
  }>({
    ventasHoy: 0,
    comprasHoy: 0,
    ordenesActivas: 0,
    tareasPendientes: 0,
    ventasDelta: null,
    comprasDelta: null,
  });
  const [kpisLoading, setKpisLoading] = useState(true);

  // Tareas
  const [tasks, setTasks] = useState<any[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  useEffect(() => {
    loadKpis();
    loadTasks();
  }, [auth.selectedCompany, selectedLocation]);

  async function loadKpis() {
    if (!auth.selectedCompany) return;
    setKpisLoading(true);
    try {
      const now = new Date();
      const today = toLocalDate(now);
      const yesterday = toLocalDate(new Date(now.getTime() - 86_400_000));

      // Hoy y ayer en paralelo, para poder calcular el delta vs. ayer.
      const [
        salesToday,
        salesYesterday,
        purchasesToday,
        purchasesYesterday,
        tasksRes,
      ] = await Promise.all([
        Services.sales
          .stats({ start_date: today, end_date: today })
          .catch(() => null),
        Services.sales
          .stats({ start_date: yesterday, end_date: yesterday })
          .catch(() => null),
        Services.purchases
          .getStats({ start_date: today, end_date: today })
          .catch(() => null),
        Services.purchases
          .getStats({ start_date: yesterday, end_date: yesterday })
          .catch(() => null),
        Services.tasks
          .index({ assigned_to: "me", status: "pending", per_page: 1 })
          .catch(() => null),
      ]);

      const ventasHoy = extractSalesTotal(salesToday);
      const comprasHoy = extractPurchasesTotal(purchasesToday);
      const tareasPendientes = extractTotal(tasksRes) ?? 0;

      setKpis({
        ventasHoy,
        comprasHoy,
        ordenesActivas: 0, // Pedidos: pendiente de endpoint
        tareasPendientes,
        ventasDelta: computeDelta(ventasHoy, extractSalesTotal(salesYesterday)),
        comprasDelta: computeDelta(
          comprasHoy,
          extractPurchasesTotal(purchasesYesterday),
        ),
      });
    } catch (err) {
      console.warn("Error cargando KPIs:", err);
    } finally {
      setKpisLoading(false);
    }
  }

  async function loadTasks() {
    if (!auth.selectedCompany) return;
    setTasksLoading(true);
    try {
      const res = await Services.tasks
        .index({
          assigned_to: "me",
          status: "pending",
          sort_by: "due_date",
          sort_order: "asc",
          per_page: 5,
        })
        .catch(() => null);
      const data = extractArray(res);
      setTasks(data);
    } catch (err) {
      console.warn("Error cargando tareas:", err);
    } finally {
      setTasksLoading(false);
    }
  }

  console.log("KPIs:", kpis);

  const firstName = auth.user?.name?.split(" ")[0] || "";
  const companyName = auth.selectedCompany?.name;
  const locationName = selectedLocation?.name;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          isMobile ? styles.contentMobile : styles.contentDesktop,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <NotificationPermissionBanner />

        {/* Nivel 1: Bienvenida */}
        <View style={styles.welcome}>
          <Text style={styles.welcomeTitle}>Hola, {firstName} 👋</Text>
          {(companyName || locationName) && (
            <Text style={styles.welcomeSubtitle}>
              {[locationName, companyName].filter(Boolean).join(" · ")}
            </Text>
          )}
        </View>

        {/* Nivel 2: KPIs */}
        <View style={styles.kpiStrip}>
          <KpiCard
            icon="cash-multiple"
            label="Ventas hoy"
            value={formatCurrency(kpis.ventasHoy)}
            loading={kpisLoading}
            delta={
              kpis.ventasDelta !== null
                ? { value: kpis.ventasDelta, period: "vs ayer" }
                : undefined
            }
          />
          <KpiCard
            icon="cart-outline"
            label="Compras hoy"
            value={formatCurrency(kpis.comprasHoy)}
            loading={kpisLoading}
            delta={
              kpis.comprasDelta !== null
                ? { value: kpis.comprasDelta, period: "vs ayer" }
                : undefined
            }
            inverseDelta
          />
          <KpiCard
            icon="clipboard-list-outline"
            label="Órdenes activas"
            value={String(kpis.ordenesActivas || 0)}
            loading={kpisLoading}
          />
          <KpiCard
            icon="checkbox-marked-circle-outline"
            label="Tareas pendientes"
            value={String(kpis.tareasPendientes)}
            loading={kpisLoading}
          />
        </View>

        {/* Nivel 3: Accesos rápidos */}
        <View>
          <SectionHeader
            title="Accesos rápidos"
            actionLabel="Ver todos"
            onAction={() => router.push("/(tabs)/home/all-modules" as any)}
          />
          <View style={styles.quickGrid}>
            {QUICK_ACCESS.map((item) => (
              <QuickAccessCard
                key={item.key}
                icon={item.icon}
                label={item.label}
                description={item.description}
                onPress={() => router.push(item.link as any)}
              />
            ))}
          </View>
        </View>

        {/* Nivel 4: Tareas pendientes */}
        <View>
          <SectionHeader
            title="Tareas pendientes"
            badge={kpis.tareasPendientes}
            actionLabel="Ver todas"
            onAction={() => router.push("/(tabs)/tasks" as any)}
          />
          {tasksLoading ? (
            <View style={styles.tasksLoading}>
              <Text style={styles.loadingText}>Cargando tareas…</Text>
            </View>
          ) : tasks.length === 0 ? (
            <View style={styles.tasksEmpty}>
              <EmptyState
                icon="checkbox-marked-circle-outline"
                title="Sin tareas pendientes"
                description="Pausa merecida ☕"
                compact
              />
            </View>
          ) : (
            <View style={styles.taskList}>
              {tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  id={task.id}
                  icon={(task.icon || "checkbox-marked-circle-outline") as any}
                  title={task.title || "Tarea"}
                  meta={buildTaskMeta(task)}
                  status={mapTaskStatus(task)}
                  isUnread={task.is_unread || task.isUnread}
                  onPress={() =>
                    router.push(`/(tabs)/tasks/${task.id}` as any)
                  }
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * Extrae el total de una respuesta que puede ser un AxiosResponse
 * envolviendo LaravelPaginatedResponse | array | { data: [...] }.
 * Tolerante a null.
 */
function extractTotal(res: any): number | undefined {
  if (!res) return undefined;
  // AxiosResponse: tiene .data
  const data = res.data ?? res;
  if (typeof data?.total === "number") return data.total;
  if (typeof data?.meta?.total === "number") return data.meta.total;
  if (Array.isArray(data)) return data.length;
  if (Array.isArray(data?.data)) return data.data.length;
  return undefined;
}

/**
 * Fecha local en formato YYYY-MM-DD. Se usa en vez de toISOString()
 * (que devuelve UTC) para evitar un desfase de un día en zonas horarias
 * detrás de UTC, p. ej. México (UTC-6): de noche toISOString() ya marca
 * el día siguiente y "hoy" saldría en cero.
 */
function toLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Total de ventas del periodo. sales.stats devuelve
 * { success, data: { overview: { total_amount } } }.
 */
function extractSalesTotal(res: any): number {
  return res?.data?.overview?.total_amount ?? 0;
}

/**
 * Total de compras del periodo. purchases.getStats devuelve
 * { success, data: { total_amount } }.
 */
function extractPurchasesTotal(res: any): number {
  return res?.data?.total_amount ?? 0;
}

/**
 * Variación porcentual respecto al periodo anterior. Devuelve null cuando
 * no hay base de comparación (ayer en cero) para no mostrar un delta
 * engañoso; en ese caso la tarjeta omite el chip.
 */
function computeDelta(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

/**
 * Extrae un array de items de la misma forma de respuesta.
 */
function extractArray(res: any): any[] {
  if (!res) return [];
  const data = res.data ?? res;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function formatCurrency(value: number): string {
  if (!value) return "$0";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function mapTaskStatus(task: any): TaskRowStatus {
  if (task.is_overdue || task.status === "overdue") return "overdue";
  if (task.status === "in_progress") return "in_progress";
  if (task.status === "completed") return "completed";
  if (task.status === "cancelled") return "cancelled";
  return "pending";
}

function buildTaskMeta(task: any): string {
  const parts: string[] = [];
  if (task.priority_label) parts.push(task.priority_label);
  if (task.status_label) parts.push(task.status_label);
  const due = formatDueDate(task.due_date);
  if (due) parts.push(due);
  return parts.join(" · ") || "Sin detalles";
}

function formatDueDate(dueDate?: string): string | null {
  if (!dueDate) return null;
  const date = new Date(dueDate);
  const now = new Date();
  const diffDays = Math.ceil(
    (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays < 0) return `Vencida hace ${Math.abs(diffDays)}d`;
  if (diffDays === 0) return "Vence hoy";
  if (diffDays === 1) return "Vence mañana";
  if (diffDays <= 7) return `Vence en ${diffDays}d`;
  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
  });
}
