import AppBar from "@/components/App/AppBar";
import { SkeletonListLoader } from "@/components/SkeletonLoader";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import useDebounce from "@/hooks/useDebounce";
import { useThemedStyles } from "@/hooks/useThemedStyles";
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
import {
  RefreshControl,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import {
  Divider,
  IconButton,
  Menu,
  Searchbar,
  Text,
  TouchableRipple,
} from "react-native-paper";
import AppListDataTable, { AppListColumn } from "./AppListDataTable";
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
  const { colors } = useTheme();

  return (
    <Menu
      visible={visible}
      onDismiss={() => setVisible(false)}
      anchor={
        <MaterialCommunityIcons
          size={20}
          style={{ padding: 8 }}
          name="dots-vertical"
          color={colors.textSecondary}
          onPress={() => setVisible(true)}
        />
      }
      contentStyle={{
        backgroundColor: colors.surface,
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
            titleStyle={{ color: action.color || colors.text }}
            style={{ backgroundColor: colors.surface }}
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
          titleStyle={{ color: colors.text }}
          style={{ backgroundColor: colors.surface }}
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
          titleStyle={{ color: colors.text }}
          style={{ backgroundColor: colors.surface }}
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
          titleStyle={{ color: colors.error }}
          style={{ backgroundColor: colors.surface }}
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
  const styles = useThemedStyles(makeAppListStyles);
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
}: AppListDescriptionProps) => {
  const styles = useThemedStyles(makeAppListStyles);
  return (
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
};

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

  // Vista de tabla para tablet/desktop
  columns?: AppListColumn<T>[];
  tabletBreakpoint?: number;
  actionColumnTitle?: string;
  actionColumnWidth?: number;
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
  columns = [],
  tabletBreakpoint = 768,
  actionColumnTitle = "Acciones",
  actionColumnWidth = 220,
}: AppListProps<T>) {
  // Estados
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [pagination, setPagination] = useState<any>(null);
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [currentPage, setCurrentPage] = useState(1);

  // Hooks
  const alerts = useAlerts();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const shouldUseDataTable = width >= tabletBreakpoint && columns.length > 0;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeAppListStyles);

  const getMenuFlag = (
    flag: ((item: T) => boolean) | boolean | undefined,
    item: T,
    defaultValue = true,
  ) => {
    if (typeof flag === "boolean") return flag;
    if (typeof flag === "function") return flag(item);
    return defaultValue;
  };

  // Ya no configuramos el header nativo, usamos Appbar
  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({
        headerRight: () => {
          if (onPressCreate || menu?.onCreate) {
            return (
              <AppBar.Action
                icon="plus"
                iconColor={colors.primary}
                onPress={handleCreate}
              />
            );
          }

          return null;
        },
      });
    }, []),
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
        params.page = currentPage;
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
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    loadData();
  }, [searchQuery, activeFilters, currentPage]);

  useFocusEffect(
    useCallback(() => {
      if (refreshOnFocus) {
        loadData(true);
      }
    }, [refreshOnFocus]),
  );

  // Handlers
  const handleFilterChange = (filterValues: Record<string, any>) => {
    setActiveFilters(filterValues);
    setCurrentPage(1); // Resetear a la primera página al cambiar filtros
  };

  const handlePageChange = (page: number) => {
    if (!pagination) return;
    const lastPage = pagination.last_page || 1;
    if (page < 1 || page > lastPage) return;
    setCurrentPage(page);
  };

  /**
   * Construye la lista de páginas visibles en la barra de paginación.
   * Si hay muchas páginas, agrupa con elipsis para no desbordar.
   */
  const buildPageItems = (current: number, last: number): (number | "…")[] => {
    if (last <= 7) {
      return Array.from({ length: last }, (_, i) => i + 1);
    }

    const items: (number | "…")[] = [];
    const add = (value: number | "…") => {
      if (items[items.length - 1] !== value) items.push(value);
    };

    add(1);
    if (current > 4) add("…");

    const start = Math.max(2, current - 1);
    const end = Math.min(last - 1, current + 1);
    for (let i = start; i <= end; i++) add(i);

    if (current < last - 3) add("…");
    add(last);

    return items;
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
      },
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
        <SearchBarComponent onChangeText={setSearchQuery} value={searchQuery} />

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
      <SearchBarComponent onChangeText={setSearchQuery} value={searchQuery} />

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
              shouldUseDataTable
                ? styles.tableScrollContainer
                : numColumns > 1
                  ? styles.scrollContainerGrid
                  : styles.scrollContainer
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[colors.primary]}
              />
            }
          >
            {shouldUseDataTable ? (
              <AppListDataTable<T>
                data={data || []}
                columns={columns}
                actionColumnTitle={actionColumnTitle}
                actionColumnWidth={actionColumnWidth}
                onRowPress={handleItemPress}
                renderActionsCell={(item) => {
                  const showView = getMenuFlag(menu?.showView, item, true);
                  const showEdit = getMenuFlag(menu?.showEdit, item, true);
                  const showDelete = getMenuFlag(menu?.showDelete, item, true);

                  return (
                    <View style={styles.tableActionsRow}>
                      {showView && (
                        <IconButton
                          icon="eye-outline"
                          size={18}
                          iconColor={colors.textSecondary}
                          onPress={() => handleItemPress(item)}
                          style={styles.tableActionButton}
                        />
                      )}
                      {showEdit && (
                        <IconButton
                          icon="pencil-outline"
                          size={18}
                          iconColor={colors.primary}
                          onPress={() => handleEdit(item)}
                          style={styles.tableActionButton}
                        />
                      )}
                      {showDelete && (
                        <IconButton
                          icon="delete-outline"
                          size={18}
                          iconColor={colors.error}
                          onPress={() => handleDelete(item)}
                          style={styles.tableActionButton}
                        />
                      )}

                      {menu?.customActions && menu.customActions.length > 0 && (
                        <ItemMenu
                          item={item}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onViewDetails={handleItemPress}
                          showView={showView}
                          showEdit={showEdit}
                          showDelete={showDelete}
                          customActions={menu.customActions}
                        />
                      )}
                    </View>
                  );
                }}
              />
            ) : numColumns > 1 ? (
              // Grid layout
              <View style={styles.gridContainer}>
                {(data || []).map((item, index) => {
                  const cardProps = renderCard({ item, index });

                  const showView = getMenuFlag(menu?.showView, item, true);
                  const showEdit = getMenuFlag(menu?.showEdit, item, true);
                  const showDelete = getMenuFlag(menu?.showDelete, item, true);

                  return (
                    <View key={item.id} style={styles.gridItem}>
                      <AppListCard>
                        <View
                          style={[
                            styles.cardMain,
                            {
                              flexDirection: "column",
                              alignItems: "flex-start",
                              gap: 8,
                            },
                          ]}
                        >
                          {cardProps.left && (
                            <View
                              style={[
                                styles.cardLeft,
                                { alignSelf: "center", marginBottom: 8 },
                              ]}
                            >
                              {cardProps.left}
                            </View>
                          )}

                          <View style={[styles.cardCenter, { width: "100%" }]}>
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
                            <View
                              style={[
                                styles.cardRight,
                                { alignSelf: "flex-end" },
                              ]}
                            >
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
                      </AppListCard>
                    </View>
                  );
                })}
              </View>
            ) : (
              // List layout
              (data || []).map((item, index) => {
                const cardProps = renderCard({ item, index });

                const showView = getMenuFlag(menu?.showView, item, true);
                const showEdit = getMenuFlag(menu?.showEdit, item, true);
                const showDelete = getMenuFlag(menu?.showDelete, item, true);

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
                          <View style={[styles.cardLeft]}>
                            {cardProps.left}
                          </View>
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
                          <View style={styles.cardRight}>
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
                    </AppListCard>
                    {showDivider && (
                      <Divider
                        style={{
                          height: 2,
                          backgroundColor: colors.border,
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
                              color: colors.textSecondary,
                              fontWeight: "bold",
                            }}
                          >
                            {(item.id || "").toString()}
                          </AppList.Description>
                        </View>
                        {cardProps.bottom.map((item, idx) => (
                          <View
                            key={item.value.toString() + idx}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                            }}
                          >
                            <AppList.Description>
                              {item.label + ": "}
                            </AppList.Description>
                            <AppList.Description
                              style={{
                                color: colors.textSecondary,
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
                            color: colors.textSecondary,
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

          {/* Controles de paginación */}
          {pagination && (
            <View
              style={[
                styles.paginationContainer,
                { marginBottom: 16 },
              ]}
            >
              <Text variant="bodySmall" style={styles.paginationText}>
                Mostrando {pagination.from ?? 0} - {pagination.to ?? 0} de{" "}
                {pagination.total ?? 0} elementos
              </Text>

              {pagination.last_page > 1 && (
                <View style={styles.paginationControls}>
                  <IconButton
                    icon="chevron-left"
                    size={20}
                    disabled={currentPage <= 1}
                    onPress={() => handlePageChange(currentPage - 1)}
                  />

                  {buildPageItems(currentPage, pagination.last_page).map(
                    (item, index) =>
                      item === "…" ? (
                        <Text
                          key={`ellipsis-${index}`}
                          style={styles.paginationEllipsis}
                        >
                          …
                        </Text>
                      ) : (
                        <TouchableRipple
                          key={`page-${item}`}
                          onPress={() => handlePageChange(item)}
                          style={[
                            styles.paginationPageButton,
                            item === currentPage
                              ? styles.paginationPageButtonActive
                              : null,
                          ]}
                        >
                          <Text
                            style={[
                              styles.paginationPageText,
                              item === currentPage
                                ? styles.paginationPageTextActive
                                : null,
                            ]}
                          >
                            {item}
                          </Text>
                        </TouchableRipple>
                      ),
                  )}

                  <IconButton
                    icon="chevron-right"
                    size={20}
                    disabled={currentPage >= pagination.last_page}
                    onPress={() => handlePageChange(currentPage + 1)}
                  />
                </View>
              )}
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
  const styles = useThemedStyles(makeAppListStyles);
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

/**
 * Factory de estilos a nivel de módulo. Usado por AppList,
 * AppListTitle, AppListDescription, SearchBarComponent y
 * AppListCard. Cada uno invoca useThemedStyles(makeAppListStyles)
 * para obtener su propio styles reactivo al tema.
 */
function makeAppListStyles(c: ReturnType<typeof useTheme>["colors"]) {
  return {
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    centerContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: c.background,
    },
    scrollContainer: {
      padding: 16,
      gap: 8,
    },
    tableScrollContainer: {
      padding: 16,
    },
    scrollContainerGrid: {
      padding: 0,
    },
    gridContainer: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      paddingVertical: 16,
      paddingHorizontal: 8,
    },
    gridItem: {
      width: "48%",
      marginHorizontal: "1%",
      marginBottom: 16,
    },
    searchbar: {
      margin: 16,
      marginBottom: 0,
      backgroundColor: c.surface,
      elevation: 2,
    },
    card: {
      backgroundColor: c.surface,
    },
    cardContent: {
      padding: 0,
    },
    cardMain: {
      flexDirection: "row" as const,
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
      fontWeight: "bold" as const,
      color: c.text,
      lineHeight: 16,
    },
    descriptionContainer: {
      marginBottom: 0,
    },
    cardDescription: {
      color: c.textSecondary,
      opacity: 0.75,
      lineHeight: 14,
    },
    loadingText: {
      marginTop: 16,
      color: c.textSecondary,
    },
    emptyText: {
      color: c.textSecondary,
      opacity: 0.7,
      textAlign: "center" as const,
      fontSize: 16,
    },
    paginationInfo: {
      alignItems: "center" as const,
      marginTop: 16,
    },
    paginationText: {
      color: c.textSecondary,
      opacity: 0.6,
    },
    paginationContainer: {
      alignItems: "center" as const,
      marginTop: 16,
      gap: 8,
    },
    paginationControls: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 4,
    },
    paginationPageButton: {
      minWidth: 36,
      height: 36,
      paddingHorizontal: 8,
      borderRadius: 18,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    paginationPageButtonActive: {
      backgroundColor: c.primary,
    },
    paginationPageText: {
      color: c.text,
      fontSize: 14,
      fontWeight: "600" as const,
    },
    paginationPageTextActive: {
      color: c.onPrimary || "#fff",
    },
    paginationEllipsis: {
      color: c.textSecondary,
      paddingHorizontal: 4,
    },
    tableActionsRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
    },
    tableActionButton: {
      margin: 0,
    },
    fab: {
      position: "absolute" as const,
      margin: 16,
      right: 0,
      bottom: 0,
    },
  };
}

// Exportar componentes estáticos
AppList.Card = AppListCard;
AppList.Title = AppListTitle;
AppList.Description = AppListDescription;

// Exportar tipos y componentes
export type { FilterConfig, FilterOption, FilterType } from "./AppListFilter";
export { AppListFilterBar };
export default AppList;
