import TaskList from "@/components/Dashboard/TaskList";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Href, useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

interface Operation {
  key: string;
  label: string;
  description: string;
  color: string;
  backgroundColor: string;
  icon: any;
  link: Href;
  iconName: string;
}

const operations: Operation[] = [
  {
    key: "produccion",
    label: "Producción",
    description:
      "Registra y gestiona las órdenes de producción, incluyendo planificación y seguimiento.",
    color: palette.error,
    link: "/(tabs)/home/production" as any,
    background: palette.surface,
    icon: require("../../../assets/images/dashboard/purchase.png"),
  },
  {
    key: "compras",
    label: "Compras",
    description:
      "Registra y gestiona las compras de productos a proveedores, incluyendo recepción y costos.",
    color: palette.primary,
    link: "/(tabs)/home/purchases" as any,
    background: palette.surface,
    icon: require("../../../assets/images/dashboard/purchase.png"),
  },
  {
    key: "ventas",
    label: "Ventas",
    description:
      "Administra las ventas a clientes, emisión de pedidos y seguimiento de entregas.",
    color: palette.textSecondary,
    link: "/(tabs)/home/sales",
    background: palette.card,
    icon: require("../../../assets/images/dashboard/sales.png"),
  },
  {
    key: "peticiones",
    label: "Peticiones",
    description:
      "Solicita productos desde sucursales que necesitan inventario.",
    color: "#fff",
    backgroundColor: "#FF9800",
    link: "/(tabs)/home/petitions",
    icon: require("../../../assets/images/dashboard/transfer.png"),
    iconName: "clipboard-list",
  },
  {
    key: "envios",
    label: "Envíos",
    description:
      "Prepara y despacha productos aprobados hacia otras ubicaciones.",
    color: "#fff",
    backgroundColor: "#4CAF50",
    link: "/(tabs)/home/shipments",
    icon: require("../../../assets/images/dashboard/transfer.png"),
    iconName: "truck-delivery",
  },
  {
    key: "recibos",
    label: "Recibos",
    description:
      "Confirma la recepción de productos y registra las entregas recibidas.",
    color: "#fff",
    backgroundColor: "#2196F3",
    link: "/(tabs)/home/receipts",
    icon: require("../../../assets/images/dashboard/transfer.png"),
    iconName: "package-variant-closed",
  },
  {
    key: "ajustes",
    label: "Ajuste",
    description:
      "Registra los ajustes de inventario por mermas, extravíos u otras causas.",
    color: palette.textSecondary,
    backgroundColor: palette.background,
    link: "/(tabs)/home/adjustment",
    icon: require("../../../assets/images/dashboard/use.png"),
    iconName: "clipboard-edit",
  },
];

const catalogos: ResourceProps[] = [
  {
    key: "productos",
    label: "Productos",
    description:
      "Administra el catálogo de productos disponibles para venta y compra, con detalles, precios y stock.",
    link: "/(tabs)/home/products" as any,
    backgroundColor: palette.surface,
    color: palette.textSecondary,
    icon: require("../../../assets/images/dashboard/products.png"),
  },
  {
    key: "categorias",
    label: "Categorías",
    description:
      "Organiza los productos en grupos lógicos para facilitar búsquedas y reportes.",
    link: "/(tabs)/home/categories",
    backgroundColor: palette.card,
    color: palette.textSecondary,
    icon: require("../../../assets/images/dashboard/categories.png"),
  },
  {
    key: "unidades",
    label: "Unidades",
    description:
      "Define las unidades de medida (kg, pieza, caja, etc.) para controlar inventarios y ventas.",
    link: "/(tabs)/home/unidades",
    backgroundColor: palette.info,
    color: palette.textSecondary,
    icon: require("../../../assets/images/dashboard/units.png"),
  },
  {
    key: "clientes",
    label: "Clientes",
    description:
      "Gestiona la información de tus clientes, historial de compras y datos de contacto.",
    link: "/(tabs)/home/clientes",
    backgroundColor: palette.background,
    color: palette.textSecondary,
    icon: require("../../../assets/images/dashboard/clients.png"),
  },
  {
    key: "proveedores",
    label: "Proveedores",
    description:
      "Registra y consulta proveedores para compras y abastecimiento de productos.",
    link: "/(tabs)/home/suppliers",
    backgroundColor: palette.secondary,
    color: "#fff",
  },
  {
    key: "sucursales",
    label: "Sucursales",
    description:
      "Administra las distintas ubicaciones físicas o almacenes de tu empresa.",
    link: "/(tabs)/home/locations",
    backgroundColor: palette.primary,
    color: "#fff",
  },
  {
    key: "companias",
    label: "Compañías",
    description:
      "Configura los datos fiscales y generales de tu empresa o grupo empresarial.",
    link: "/(tabs)/home/companies",
    backgroundColor: palette.accent,
    color: palette.textSecondary,
  },
  {
    key: "usuarios",
    label: "Usuarios",
    description:
      "Controla el acceso de los usuarios, sus datos y permisos dentro del sistema.",
    link: "/(tabs)/home/users",
    backgroundColor: palette.warning,
    color: palette.textSecondary,
  },
  {
    key: "trabajadores",
    label: "Trabajadores",
    description:
      "Administra la información de empleados, asignaciones de roles y ubicaciones de trabajo.",
    link: "/(tabs)/home/workers",
    backgroundColor: palette.info,
    color: "#fff",
    icon: require("../../../assets/images/dashboard/use.png"),
  },
  {
    key: "roles",
    label: "Roles y Permisos",
    description:
      "Define los roles y permisos para gestionar la seguridad y accesos de la plataforma.",
    link: "/(tabs)/home/roles",
    backgroundColor: palette.error,
    color: "#fff",
  },
];

interface ResourceProps {
  key: string;
  label: string;
  description: string;
  link: Href;
  backgroundColor?: string;
  background?: string;
  color: string;
  icon?: ImageSourcePropType;
}

export default function HomeScreen() {
  const [selected, setSelected] = React.useState("compras");

  const auth = useAuth();
  const { selectedLocation } = useSelectedLocation();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="titleLarge" style={{ fontWeight: "bold" }}>
            Hola, {auth.user?.name?.split(" ")[0] || ""}
          </Text>
          {/* Company and Location Info */}
          {(auth.selectedCompany || selectedLocation) && (
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                marginTop: 8,
                width: "100%",
              }}
            >
              {auth.selectedCompany && (
                <View style={styles.compactInfo}>
                  <MaterialCommunityIcons
                    name="office-building"
                    size={14}
                    color={palette.primary}
                  />
                  <Text variant="bodySmall" numberOfLines={1}>
                    {auth.selectedCompany.name}
                  </Text>
                </View>
              )}
              {selectedLocation && (
                <View style={styles.compactInfo}>
                  <MaterialCommunityIcons
                    name="map-marker"
                    size={14}
                    color={palette.blue}
                  />
                  <Text variant="bodySmall" numberOfLines={1}>
                    {selectedLocation.name}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
        {/* Movimientos horizontal */}
        <Text variant="titleMedium" style={styles.title}>
          Movimientos
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12 }}
        >
          {movimientos.map((mov) => (
            <DashboardButton
              key={mov.key}
              title={mov.label}
              description={mov.description}
              link={mov.link}
              backgroundColor={
                selected === mov.key
                  ? mov.color
                  : mov.background || mov.backgroundColor || palette.surface
              }
              icon={mov.icon || undefined}
              color={selected === mov.key ? "#fff" : mov.color}
              style={{
                minWidth: 175,
                flexBasis: 175,
                minHeight: 120,
                maxWidth: 250,
                aspectRatio: undefined,
              }}
              // onPress={() => setSelected(mov.key)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Tasks Section */}
      <TaskList limit={10} />
    </View>
  );
}

interface DashboardButtonProps {
  title: string;
  description?: string;
  link: Href;
  backgroundColor: string;
  color: string;
  icon?: ImageSourcePropType;
  iconName?: string;
  style?: React.ComponentProps<typeof Card>["style"];
}

function DashboardButton(props: DashboardButtonProps) {
  const router = useRouter();

  return (
    <Card
      onPress={() => {
        console.log("Navigating to:", props.link);

        router.push(props.link);
      }}
      style={{
        flex: 1,
        flexBasis: "48%",
        minHeight: 100,
        justifyContent: "center",
        backgroundColor: props.backgroundColor,
        ...(props.style && typeof props.style === "object" ? props.style : {}),
      }}
    >
      <Card.Title
        titleStyle={{ color: props.color, fontWeight: "bold", marginBottom: 0 }}
        title={props.title}
        subtitle={props.description}
        subtitleNumberOfLines={3}
        subtitleStyle={{
          color: props.color,
          opacity: 0.7,
          fontSize: 11,
          marginTop: -4,
          lineHeight: 14,
        }}
        right={() => {
          return (
            props.icon && (
              <Image
                source={props.icon}
                style={{
                  height: 60,
                  width: 60,
                  aspectRatio: 1,
                  backgroundColor: "transparent",
                }}
              />
            )
          );
        }}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  compactInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: palette.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  compactInfoText: {
    color: palette.textSecondary,
    fontWeight: "500",
    fontSize: 12,
    flex: 1,
  },
  operationCard: {
    width: 140,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
});
