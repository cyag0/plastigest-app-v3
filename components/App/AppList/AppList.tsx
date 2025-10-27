import AppBar from "@/components/App/AppBar";
import palette from "@/constants/palette";
import {
  CrudService,
  IndexParams,
  LaravelPaginatedResponse,
  handleApiError,
} from "@/utils/services/crudService";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Card, Searchbar, Text } from "react-native-paper";

// Tipos para las props del componente
interface CardRenderProps<T> {
  item: T;
  index: number;
}

interface CardContentProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  left?: React.ReactNode;
  right?: React.ReactNode;
}

// Componentes estáticos para AppList
const AppListCard = ({
  children,
  onPress,
  style = {},
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
}) => (
  <Card style={[styles.card, style]} onPress={onPress}>
    <Card.Content style={styles.cardContent}>{children}</Card.Content>
  </Card>
);

const AppListTitle = ({
  children,
  style = {},
}: {
  children: React.ReactNode;
  style?: any;
}) => (
  <View style={styles.titleContainer}>
    {typeof children === "string" ? (
      <Text variant="titleMedium" style={[styles.cardTitle, style]}>
        {children}
      </Text>
    ) : (
      children
    )}
  </View>
);

type AppListDescriptionProps = {
  children: React.ReactNode;
  style?: any;
} & React.ComponentProps<typeof Text>;

const AppListDescription = ({
  children,
  style = {},
  ...textProps
}: AppListDescriptionProps) => (
  <View style={styles.descriptionContainer}>
    {typeof children === "string" ? (
      <Text
        variant="bodyMedium"
        style={[styles.cardDescription, style]}
        {...textProps}
      >
        {children}
      </Text>
    ) : (
      children
    )}
  </View>
);

interface AppListProps<T> {
  // Props principales
  title: string;
  service: CrudService<T>;

  // Props para personalizar el renderizado de cada card
  renderCard: (props: CardRenderProps<T>) => CardContentProps;

  // Props opcionales
  onPressCreate?: () => void;
  detailRoute?: (item: T) => string;
  searchPlaceholder?: string;
  emptyMessage?: string;

  // Props para filtros adicionales
  defaultFilters?: Partial<IndexParams>;

  // Props para personalizar comportamiento
  refreshOnFocus?: boolean;
  showFab?: boolean;
  fabLabel?: string;
  usePagination?: boolean; // Nueva prop para controlar paginación
  itemsPerPage?: number; // Nueva prop para controlar items por página

  // Props para eventos
  onItemPress?: (item: T) => void;
}

function AppList<T extends { id: number | string }>({
  title,
  service,
  renderCard,
  onPressCreate,
  detailRoute,
  searchPlaceholder = "Buscar...",
  emptyMessage = "No hay elementos para mostrar",
  defaultFilters = {},
  refreshOnFocus = true,
  showFab = true,
  fabLabel = "Agregar",
  usePagination = true,
  itemsPerPage = 20,
  onItemPress,
}: AppListProps<T>) {
  // Estados
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [pagination, setPagination] = useState<any>(null);

  // Navigation
  const navigation = useNavigation();

  // Ya no configuramos el header nativo, usamos Appbar
  useFocusEffect(
    useCallback(() => {
      // Opcional: configurar solo el título si necesitas
      navigation.setOptions({
        headerShown: false, // Ocultar header nativo para usar nuestro Appbar
      });
    }, [])
  );

  // Cargar datos
  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const params: IndexParams = {
        ...defaultFilters,
        search: searchQuery || undefined,
      };

      // Solo agregar parámetros de paginación si está habilitada
      if (usePagination) {
        params.paginated = true;
        params.per_page = itemsPerPage;
      }

      const response = await service.index(params);

      // Manejar respuesta paginada o array simple
      if (Array.isArray(response.data)) {
        setData(response.data);
        setPagination(null);
      } else {
        const paginatedData = response.data as LaravelPaginatedResponse<T>;
        setData(paginatedData.data);
        setPagination(paginatedData.meta);
      }
    } catch (error) {
      const apiError = handleApiError(error);
      console.error("Error loading data:", apiError);
      // Aquí podrías mostrar un toast o alert con el error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Efectos
  useEffect(() => {
    loadData();
  }, [searchQuery]);

  useFocusEffect(
    useCallback(() => {
      if (refreshOnFocus) {
        loadData(true);
      }
    }, [refreshOnFocus])
  );

  // Handlers
  const handleItemPress = (item: T) => {
    if (onItemPress) {
      onItemPress(item);
    } else if (detailRoute) {
      const route = detailRoute(item);
      (navigation as any).navigate(route);
    }
  };

  const handleRefresh = () => {
    loadData(true);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        {/* AppBar para estado de loading */}
        <AppBar
          title={title}
          showBackButton={true}
          showSearchButton={false}
          showNotificationButton={false}
          showProfileButton={false}
        />

        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </View>
    );
  }

  if (!loading && data.length === 0) {
    return (
      <View style={styles.container}>
        {/* AppBar para estado vacío */}
        <AppBar
          title={title}
          showBackButton={true}
          showSearchButton={false}
          showNotificationButton={false}
          showProfileButton={false}
          rightActions={
            showFab && onPressCreate ? (
              <AppBar.Action
                icon="plus"
                iconColor={palette.error}
                onPress={onPressCreate}
              />
            ) : undefined
          }
        />

        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* AppBar personalizado */}
      <AppBar
        title={title}
        showBackButton={true}
        showNotificationButton={false}
        showProfileButton={false}
        onSearchPress={() => setShowSearch(!showSearch)}
        rightActions={
          showFab && onPressCreate ? (
            <AppBar.Action
              icon="plus"
              iconColor={palette.error}
              onPress={onPressCreate}
            />
          ) : undefined
        }
      />

      {/* Buscador */}
      {showSearch && (
        <Searchbar
          placeholder={searchPlaceholder}
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          onClearIconPress={() => setSearchQuery("")}
        />
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[palette.primary]}
          />
        }
      >
        {data.map((item, index) => {
          const cardProps = renderCard({ item, index });

          return (
            <AppListCard key={item.id} onPress={() => handleItemPress(item)}>
              <View style={[styles.cardMain]}>
                {cardProps.left && (
                  <View style={[styles.cardLeft]}>{cardProps.left}</View>
                )}

                <View style={styles.cardCenter}>
                  {cardProps.title && (
                    <AppListTitle>{cardProps.title}</AppListTitle>
                  )}

                  {cardProps.description && (
                    <AppListDescription>
                      {cardProps.description}
                    </AppListDescription>
                  )}
                </View>

                {cardProps.right && (
                  <View style={styles.cardRight}>{cardProps.right}</View>
                )}
              </View>
            </AppListCard>
          );
        })}
      </ScrollView>

      {/* Información de paginación */}
      {pagination && (
        <View style={[styles.paginationInfo, { marginBottom: 16 }]}>
          <Text variant="bodySmall" style={styles.paginationText}>
            Mostrando {pagination.from} - {pagination.to} de {pagination.total}{" "}
            elementos
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: palette.background,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  searchbar: {
    margin: 16,
    marginBottom: 0,
    backgroundColor: "#fff",
    elevation: 2,
  },
  card: {
    marginBottom: 12,
    backgroundColor: "#fff",
    elevation: 2,
  },
  cardContent: {
    padding: 16,
  },
  cardMain: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  cardLeft: {
    marginRight: 12,
    justifyContent: "center",
  },
  cardCenter: {
    flex: 1,
  },
  cardRight: {
    marginLeft: 12,
    justifyContent: "center",
  },
  titleContainer: {
    marginBottom: 4,
  },
  cardTitle: {
    fontWeight: "bold",
    color: palette.textSecondary,
  },
  descriptionContainer: {
    marginBottom: 0,
  },
  cardDescription: {
    color: palette.textSecondary,
    opacity: 0.7,
  },
  loadingText: {
    marginTop: 16,
    color: palette.textSecondary,
  },
  emptyText: {
    color: palette.textSecondary,
    opacity: 0.7,
    textAlign: "center",
    fontSize: 16,
  },
  paginationInfo: {
    alignItems: "center",
    marginTop: 16,
  },
  paginationText: {
    color: palette.textSecondary,
    opacity: 0.6,
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

// Exportar componentes estáticos
AppList.Card = AppListCard;
AppList.Title = AppListTitle;
AppList.Description = AppListDescription;

export default AppList;
