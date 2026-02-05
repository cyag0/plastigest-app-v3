import AppBar from "@/components/App/AppBar";
import { SkeletonListLoader } from "@/components/SkeletonLoader";
import palette from "@/constants/palette";
import { useAlerts } from "@/hooks/useAlerts";
import useDebounce from "@/hooks/useDebounce";
import {
  CrudService,
  IndexParams,
  LaravelPaginatedResponse,
  handleApiError,
} from "@/utils/services/crudService";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { router } from "expo-router";
import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { Platform, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Divider, Menu, Searchbar, Text } from "react-native-paper";
import AppListFilterBar, { FilterConfig } from "./AppListFilter";

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
  bottom?: Array<{
    label: string;
    value: string | number;
  }>;
}

// Componente para el menú de acciones de cada item
interface ItemMenuProps<T> {
  item: T;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  onViewDetails?: (item: T) => void;
  showView?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
  customActions?: Array<{
    title: string;
    icon: string;
    onPress: (item: T) => void;
    color?: string;
    show?: boolean | ((item: T) => boolean);
  }>;
}

function ItemMenu<T>({
  item,
  onEdit,
  onDelete,
  onViewDetails,
  showView = true,
  showEdit = true,
  showDelete = true,
  customActions = [],
}: ItemMenuProps<T>) {
  const [visible, setVisible] = useState(false);

  return (
    <Menu
      visible={visible}
      onDismiss={() => setVisible(false)}
      anchor={
        <MaterialCommunityIcons
          size={20}
          style={{ padding: 8 }}
          name="dots-vertical"
          color={palette.textSecondary}
          onPress={() => setVisible(true)}
        />
      }
      contentStyle={{
        backgroundColor: palette.background,
      }}
    >
      {customActions.map((action, index) => {
        const shouldShow =
          typeof action.show === "boolean"
            ? action.show
            : typeof action.show === "function"
            ? action.show(item)
            : true;

        if (!shouldShow) return null;

        return (
          <Menu.Item
            key={"action-" + index}
            onPress={() => {
              setVisible(false);
              action.onPress(item);
            }}
            title={action.title}
            leadingIcon={action.icon}
            titleStyle={{ color: action.color || palette.text }}
            style={{ backgroundColor: palette.background }}
          />
        );
      })}
      {showView && (
        <Menu.Item
          onPress={() => {
            setVisible(false);
            onViewDetails?.(item);
          }}
          title="Ver detalles"
          leadingIcon="eye"
          titleStyle={{ color: palette.text }}
          style={{ backgroundColor: palette.background }}
        />
      )}
      {showEdit && (
        <Menu.Item
          onPress={() => {
            setVisible(false);
            onEdit(item);
          }}
          title="Editar"
          leadingIcon="pencil"
          titleStyle={{ color: palette.text }}
          style={{ backgroundColor: palette.background }}
        />
      )}
      {showDelete && (
        <Menu.Item
          onPress={() => {
            setVisible(false);
            onDelete(item);
          }}
          title="Eliminar"
          leadingIcon="delete"
          titleStyle={{ color: palette.error }}
          style={{ backgroundColor: palette.background }}
        />
      )}
    </Menu>
  );
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
  <View
    style={[
      {
        elevation: 0,
        boxShadow: "none",
        borderWidth: 0,
        outline: "none",
      },
    ]}
  >
    {children}
  </View>
);

const AppListTitle = ({
  children,
  style = {},
  textProps,
}: {
  children: React.ReactNode;
  style?: any;
  textProps?: React.ComponentProps<typeof Text>;
}) => {
  return (
    <View style={styles.titleContainer}>
      {typeof children === "string" ? (
        <Text
          variant="titleMedium"
          style={[styles.cardTitle, style]}
          {...textProps}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
};

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
        variant="bodySmall"
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
  filters?: FilterConfig[]; // Configuración de filtros

  // Props para personalizar comportamiento
  refreshOnFocus?: boolean;
  showFab?: boolean;
  fabLabel?: string;
  usePagination?: boolean; // Nueva prop para controlar paginación
  itemsPerPage?: number; // Nueva prop para controlar items por página

  // Props para eventos
  onItemPress?: (item: T) => void;
  menu?: {
    onEdit?: (item: T) => void;
    onDelete?: (item: T) => void;
    onShow?: (item: T) => void;
    onCreate?: () => void;
    showView?: ((item: T) => boolean) | boolean;
    showEdit?: ((item: T) => boolean) | boolean;
    showDelete?: ((item: T) => boolean) | boolean;
    customActions?: Array<{
      title: string;
      icon: string;
      onPress: (item: T) => void;
      color?: string;
      show?: boolean | ((item: T) => boolean);
    }>;
  };

  showDivider?: boolean;
  showAppBar?: boolean;
  numColumns?: number; // Número de columnas para grid layout
  columnGap?: number; // Espaciado entre columnas
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
  filters = [],
  refreshOnFocus = true,
  showFab = true,
  fabLabel = "Agregar",
  usePagination = true,
  itemsPerPage = 20,
  onItemPress,
  menu,
  showDivider = true,
  showAppBar = true,
  numColumns = 1,
  columnGap = 12,
}: AppListProps<T>) {
  // Estados
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [pagination, setPagination] = useState<any>(null);
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});

  // Hooks
  const alerts = useAlerts();
  const navigation = useNavigation();

  // Ya no configuramos el header nativo, usamos Appbar
  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({
        headerRight: () => {
          if (onPressCreate || menu?.onCreate) {
            return (
              <AppBar.Action
                icon="plus"
                iconColor={palette.error}
                onPress={handleCreate}
              />
            );
          }

          return null;
        },
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
        ...activeFilters, // Agregar filtros activos
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
      alerts.error("Error al cargar los datos: " + apiError.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Efectos
  useEffect(() => {
    loadData();
  }, [searchQuery, activeFilters]);

  useFocusEffect(
    useCallback(() => {
      if (refreshOnFocus) {
        loadData(true);
      }
    }, [refreshOnFocus])
  );

  // Handlers
  const handleFilterChange = (filterValues: Record<string, any>) => {
    setActiveFilters(filterValues);
  };

  const handleItemPress = (item: T) => {
    if (menu?.onShow) {
      menu.onShow(item);
    } else if (onItemPress) {
      onItemPress(item);
    } else if (detailRoute) {
      const route = detailRoute(item);
      router.push(route as any);
    }
  };

  const handleRefresh = () => {
    loadData(true);
  };

  const handleEdit = (item: T) => {
    if (menu?.onEdit) {
      menu.onEdit(item);
    } else {
      handleItemPress(item);
    }
  };

  const handleCreate = () => {
    if (menu?.onCreate) {
      menu.onCreate();
    } else if (onPressCreate) {
      onPressCreate();
    }
  };

  const handleDelete = async (item: T) => {
    if (menu?.onDelete) {
      menu.onDelete(item);
      return;
    }

    const confirmed = await alerts.confirm(
      `¿Estás seguro de que deseas eliminar este elemento?`,
      {
        title: "Confirmar eliminación",
        okText: "Eliminar",
        cancelText: "Cancelar",
      }
    );

    if (!confirmed) {
      return;
    }

    try {
      await service.destroy(item.id);
      alerts.success("Elemento eliminado exitosamente");
      loadData(true);
    } catch (error: any) {
      const errorMessage = handleApiError(error);
      alerts.error(errorMessage.message || "Error al eliminar el elemento");
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <SearchBarComponent 
          onChangeText={setSearchQuery} 
          value={searchQuery}
        />
        
        {/* Barra de filtros */}
        <AppListFilterBar
          filters={filters}
          values={activeFilters}
          onChange={handleFilterChange}
        />
        
        <SkeletonListLoader />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SearchBarComponent 
        onChangeText={setSearchQuery}
        value={searchQuery}
      />

      {/* Barra de filtros */}
      <AppListFilterBar
        filters={filters}
        values={activeFilters}
        onChange={handleFilterChange}
      />

      {data.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={
              numColumns > 1
                ? styles.scrollContainerGrid
                : styles.scrollContainer
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[palette.primary]}
              />
            }
          >
            {numColumns > 1 ? (
              // Grid layout
              <View
                style={styles.gridContainer}
              >
                {(data || []).map((item, index) => {
                  const cardProps = renderCard({ item, index });

                  const showView =
                    typeof menu?.showView === "boolean"
                      ? menu?.showView
                      : typeof menu?.showView === "function"
                      ? menu.showView(item)
                      : true;

                  const showEdit =
                    typeof menu?.showEdit === "boolean"
                      ? menu?.showEdit
                      : typeof menu?.showEdit === "function"
                      ? menu.showEdit(item)
                      : true;

                  const showDelete =
                    typeof menu?.showDelete === "boolean"
                      ? menu?.showDelete
                      : typeof menu?.showDelete === "function"
                      ? menu.showDelete(item)
                      : true;

                  return (
                    <View
                      key={item.id}
                      style={styles.gridItem}
                    >
                      <AppListCard>
                        <View
                          style={[
                            styles.cardMain,
                            {
                              flexDirection: 'column',
                              alignItems: "flex-start",
                              gap: 8,
                            },
                          ]}
                        >
                          {cardProps.left && (
                            <View style={[styles.cardLeft, { alignSelf: 'center', marginBottom: 8 }]}>
                              {cardProps.left}
                            </View>
                          )}

                          <View style={[styles.cardCenter, { width: '100%' }]}>
                            {cardProps.title && (
                              <AppListTitle>{cardProps.title}</AppListTitle>
                            )}

                            {cardProps.subtitle && (
                              <AppListSubtitle>{cardProps.subtitle}</AppListSubtitle>
                            )}

                            {cardProps.description && (
                              <AppListDescription>
                                {cardProps.description}
                              </AppListDescription>
                            )}
                          </View>

                          {cardProps.right && (
                            <View style={[styles.cardRight, { alignSelf: 'flex-end' }]}>
                              {cardProps.right}
                            </View>
                          )}

                          <ItemMenu
                            item={item}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onViewDetails={handleItemPress}
                            showView={showView}
                            showEdit={showEdit}
                            showDelete={showDelete}
                            customActions={menu?.customActions}
                          />
                        </View>

                        {cardProps.bottom && (
                          <AppListBottom items={cardProps.bottom} />
                        )}

                        {cardProps.actions && cardProps.actions.length > 0 && (
                          <AppListActions actions={cardProps.actions} />
                        )}
                      </AppListCard>
                    </View>
                  );
                })}
              </View>
            ) : (
              // List layout
              (data || []).map((item, index) => {
              const cardProps = renderCard({ item, index });

              const showView =
                typeof menu?.showView === "boolean"
                  ? menu?.showView
                  : typeof menu?.showView === "function"
                  ? menu.showView(item)
                  : true;

              const showEdit =
                typeof menu?.showEdit === "boolean"
                  ? menu?.showEdit
                  : typeof menu?.showEdit === "function"
                  ? menu.showEdit(item)
                  : true;

              const showDelete =
                typeof menu?.showDelete === "boolean"
                  ? menu?.showDelete
                  : typeof menu?.showDelete === "function"
                  ? menu.showDelete(item)
                  : true;

              return (
                <React.Fragment key={item.id}>
                  <AppListCard /* onPress={() => handleItemPress(item)} */>
                    <View
                      style={[
                        styles.cardMain,
                        {
                          alignItems: "center",
                          gap: 8,
                        },
                      ]}
                    >
                      {cardProps.left && (
                        <View style={[styles.cardLeft]}>{cardProps.left}</View>
                      )}

                      <View style={[styles.cardCenter]}>
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

                      <ItemMenu
                        item={item}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onViewDetails={handleItemPress}
                        showView={showView}
                        showEdit={showEdit}
                        showDelete={showDelete}
                        customActions={menu?.customActions}
                      />
                    </View>
                  </AppListCard>
                  {showDivider && (
                    <Divider
                      style={{
                        height: 2,
                        backgroundColor: palette.border,
                      }}
                    />
                  )}

                  {cardProps.bottom ? (
                    <View
                      style={{
                        flexDirection: "row",
                        padding: 4,
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        //flexWrap: "wrap",
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          padding: 4,
                          alignItems: "center",
                        }}
                      >
                        <AppList.Description>ID: </AppList.Description>
                        <AppList.Description
                          style={{
                            color: palette.textSecondary,
                            fontWeight: "bold",
                          }}
                        >
                          {(item.id || "").toString()}
                        </AppList.Description>
                      </View>
                      {cardProps.bottom.map((item, idx) => (
                        <View
                          key={item.value.toString() + idx}
                          style={{ flexDirection: "row", alignItems: "center" }}
                        >
                          <AppList.Description>
                            {item.label + ": "}
                          </AppList.Description>
                          <AppList.Description
                            style={{
                              color: palette.textSecondary,
                              fontWeight: "bold",
                            }}
                          >
                            {item.value.toString()}
                          </AppList.Description>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View
                      style={{
                        flexDirection: "row",
                        padding: 4,
                        alignItems: "center",
                      }}
                    >
                      <AppList.Description>ID: </AppList.Description>
                      <AppList.Description
                        style={{
                          color: palette.textSecondary,
                          fontWeight: "bold",
                        }}
                      >
                        {(item.id || "").toString()}
                      </AppList.Description>
                    </View>
                  )}
                </React.Fragment>
              );
            })
            )}
          </ScrollView>

          {/* Información de paginación */}
          {pagination && (
            <View style={[styles.paginationInfo, { marginBottom: 16 }]}>
              <Text variant="bodySmall" style={styles.paginationText}>
                Mostrando {pagination.from} - {pagination.to} de{" "}
                {pagination.total} elementos
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

interface SearchBarComponentProps {
  onChangeText: (text: string) => void;
  value: string;
}

function SearchBarComponent(props: SearchBarComponentProps) {
  const [searchQuery, setSearchQuery] = useState(props.value);
  const { run } = useDebounce((text: string) => {
    props.onChangeText(text);
  });

  // Sincronizar con el valor externo si cambia
  useEffect(() => {
    setSearchQuery(props.value);
  }, [props.value]);

  const handleChangeText = (text: string) => {
    setSearchQuery(text);
    run(text);
  };

  const handleClear = () => {
    setSearchQuery("");
    props.onChangeText(""); // Actualizar inmediatamente sin debounce
  };

  return (
    <Searchbar
      placeholder="Buscar..."
      onChangeText={handleChangeText}
      value={searchQuery}
      style={styles.searchbar}
      mode="bar"
      onClearIconPress={handleClear}
    />
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
    gap: 8,
  },
  scrollContainerGrid: {
    padding: 0,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  gridItem: {
    width: '48%',
    marginHorizontal: '1%',
    marginBottom: 16,
  },
  searchbar: {
    margin: 16,
    marginBottom: 0,
    backgroundColor: "#fff",
    elevation: 2,
  },
  card: {
    //marginBottom: 12,
    backgroundColor: "#fff",
    //elevation: 2,
  },
  cardContent: {
    padding: 0,
  },
  cardMain: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  cardLeft: {
    justifyContent: "center",
  },
  cardCenter: {
    flex: 1,
  },
  cardRight: {
    justifyContent: "center",
  },
  titleContainer: {
    marginBottom: 4,
  },
  cardTitle: {
    fontWeight: "bold",
    color: palette.textSecondary,
    lineHeight: 16,
  },
  descriptionContainer: {
    marginBottom: 0,
  },
  cardDescription: {
    color: palette.textSecondary,
    opacity: 0.7,
    lineHeight: 14,
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

// Exportar tipos y componentes
export type { FilterConfig, FilterOption, FilterType } from "./AppListFilter";
export { AppListFilterBar };
export default AppList;
