import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { Href, useNavigation, useRouter } from "expo-router";
import * as React from "react";
import {
  Image,
  ImageSourcePropType,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Card, Text } from "react-native-paper";

const movimientos: ResourceProps[] = [
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
    key: "transferencias",
    label: "Transferencias",
    description:
      "Mueve inventario entre sucursales o almacenes de la empresa de forma controlada.",
    color: "#fff",
    background: palette.textSecondary,
    link: "/(tabs)/home/locations",
    icon: require("../../../assets/images/dashboard/transfer.png"),
  },
  {
    key: "empresa",
    label: "Uso de la empresa",
    description:
      "Registra el uso interno de productos para actividades propias de la compañía.",
    color: palette.textSecondary,
    background: palette.background,
    link: "/(tabs)/home/roles",
    icon: require("../../../assets/images/dashboard/use.png"),
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

  const naviagator = useNavigation();

  const appContext = useAuth();

  return (
    <View style={[styles.container]}>
      <ScrollView
        contentContainerStyle={{ gap: 12, padding: 20, paddingTop: 0 }}
      >
        <Text variant="titleMedium" style={styles.title}>
          Menu
        </Text>
        {/*  <View style={{ marginVertical: 8 }}>
          <AppInput
            placeholder="Compras, ventas, productos..."
            label={"Buscar en el menú..."}
            left="magnify"
          />
        </View> */}
        {/* Botones destacados */}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <DashboardButton
            title="Inventario"
            description="Consulta y administra el stock disponible en tiempo real."
            link="/(tabs)/home/roles"
            backgroundColor={palette.textSecondary}
            color="#fff"
            icon={require("../../../assets/images/dashboard/inventory.png")}
          />
          <DashboardButton
            title="Compañía"
            description="Configura los datos generales y fiscales de tu empresa."
            link={
              `/(tabs)/home/companies/${appContext.selectedCompany?.id}` as any
            }
            backgroundColor={palette.background}
            color="#000"
            icon={require("../../../assets/images/dashboard/company.png")}
          />
          <DashboardButton
            title="Sucursales"
            description="Gestiona las ubicaciones físicas y almacenes de la organización."
            link="/(tabs)/home/locations"
            backgroundColor={palette.primary}
            color="#fff"
            icon={require("../../../assets/images/dashboard/location.png")}
          />
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
        <Text variant="titleMedium" style={styles.title}>
          Catálogos Principales
        </Text>
        {/* Catálogos principales grid */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {catalogos.map((cat) => (
            <DashboardButton
              key={cat.key}
              title={cat.label}
              description={cat.description}
              link={cat.link}
              backgroundColor={cat.backgroundColor || palette.surface}
              color={cat.color}
              style={{ minWidth: 120, flexBasis: "48%" }}
              icon={cat.icon || undefined}
            />
          ))}
        </View>
      </ScrollView>
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
    backgroundColor: "#fff",
  },
  title: {
    marginBottom: 8,
    textAlign: "center",
    fontWeight: "bold",
  },
});
