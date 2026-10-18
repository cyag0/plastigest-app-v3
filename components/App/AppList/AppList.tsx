import AppBar from "@/components/App/AppBar";
import { SkeletonListLoader } from "@/components/SkeletonLoader";
import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useCan } from "@/hooks/useCan";
import useDebounce from "@/hooks/useDebounce";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import type { PermissionRule } from "@/utils/permissions/permissions";
import { notifyError } from "@/utils/errorNotice";
import {
  CrudService,
  IndexParams,
  LaravelPaginatedResponse,
} from "@/utils/services/crudService";
import { logCaughtError } from "@/utils/silenceLogs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "expo-router";
import { router } from "expo-router";
import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from "react-native";
import {
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

  // Sin ninguna opción visible (p. ej. sin permisos) no se muestra el botón
  // de tres puntos: abría un menú vacío.
  const hasCustomActions = customActions.some((action) =>
    typeof action.show === "function" ? action.show(item) : action.show !== false,
  );
  if (!showView && !showEdit && !showDelete && !hasCustomActions) return null;

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
  /** Nombre del "+" para lectores de pantalla ("Nuevo ajuste"). */
  createLabel?: string;
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
  /** @deprecated La tabla ya solo lleva el menú ⋮ (ancho fijo, sin título). */
  actionColumnTitle?: string;
  /** @deprecated La tabla ya solo lleva el menú ⋮ (ancho fijo, sin título). */
  actionColumnWidth?: number;

  /**
   * Permisos de la lista (opcional). Con `permissionPrefix="products"` se
   * piden products_create (botón "+"), products_read (abrir el renglón y
   * "Ver detalles"), products_update ("Editar") y products_delete
   * ("Eliminar"): sin el permiso la acción no se muestra. Sin estos props la
   * lista se comporta como siempre.
   */
  permissionPrefix?: string;
  /**
   * Cambia el permiso de una acción (gana sobre `permissionPrefix`). Un
   * permiso o varios (basta uno); un arreglo vacío no exige nada.
   *   permissions={{ create: "inventory_manage", update: [], delete: [] }}
   */
  permissions?: Partial<Record<"create" | "read" | "update" | "delete", PermissionRule>>;
}

function AppList<T extends { id: number | string }>({
  title,
  service,
  renderCard,
  onPressCreate,
  createLabel,
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
  permissionPrefix,
  permissions,
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
  const isWide = width >= tabletBreakpoint;
  // Tabla solo en web con pantalla ancha (mouse, muchas columnas). En la app
  // (tableta, teléfono acostado) van las tarjetas del teléfono en columnas:
  // se tocan mejor y no hay que desplazarse a los lados.
  const shouldUseDataTable = Platform.OS === "web" && isWide && columns.length > 0;
  // Las columnas de tarjetas salen del ancho de la lista y no del de la
  // ventana: junto a un panel lateral (Caja) la lista es más angosta. Antes de
  // medirla, el de la ventana (a pantalla completa es el mismo).
  const [listWidth, setListWidth] = useState<number | null>(null);
  const onContainerLayout = useCallback(
    (e: LayoutChangeEvent) => setListWidth(e.nativeEvent.layout.width),
    [],
  );
  const cardColumns =
    Platform.OS !== "web" && isWide && numColumns === 1
      ? Math.min(3, Math.max(1, Math.floor((listWidth ?? width) / 380)))
      : 1;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeAppListStyles);

  // Permisos de las acciones (permissionPrefix / permissions). Sin esos props
  // la regla queda vacía y todo se permite, como antes.
  const { can } = useCan();
  const actionRule = (action: "create" | "read" | "update" | "delete") =>
    permissions?.[action] ?? (permissionPrefix ? `${permissionPrefix}_${action}` : undefined);
  const allowCreate = can(actionRule("create"));
  const allowRead = can(actionRule("read"));
  const allowUpdate = can(actionRule("update"));
  const allowDelete = can(actionRule("delete"));

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
          if ((onPressCreate || menu?.onCreate) && allowCreate) {
            return (
              <AppBar.Action
                icon="plus"
                iconColor={colors.primary}
                onPress={handleCreate}
                accessibilityLabel={createLabel ?? "Nuevo"}
              />
            );
          }

          return null;
        },
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allowCreate]),
  );

  // Solo se aplica la respuesta de la petición más reciente: con búsquedas o
  // cambios de página rápidos una respuesta vieja podía llegar después y
  // pisar los resultados.
  const requestIdRef = React.useRef(0);

  // Cargar datos
  const loadData = async (isRefresh = false) => {
    const requestId = ++requestIdRef.current;
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
      if (requestId !== requestIdRef.current) return;

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
      if (requestId !== requestIdRef.current) return;
      // Mensaje del servidor (o de red) en el aviso de la app; sin el aviso
      // rojo de LogBox si es una falla del API.
      logCaughtError("Error loading data:", error);
      notifyError(error, "No se pudieron cargar los datos.");
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  // La versión más reciente de loadData (con la búsqueda, filtros y página
  // actuales). El refresco al volver a la pantalla usaba la del primer render
  // y recargaba la página 1 sin filtros aunque la UI siguiera mostrándolos.
  const loadDataRef = React.useRef(loadData);
  useEffect(() => {
    loadDataRef.current = loadData;
  });

  // Efectos
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    loadData();
  }, [searchQuery, activeFilters, currentPage]);

  // El primer foco coincide con la carga inicial (efecto de arriba): no se
  // repite la petición.
  const hasFocusedRef = React.useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedRef.current) {
        hasFocusedRef.current = true;
        return;
      }
      if (refreshOnFocus) {
        loadDataRef.current(true);
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
    // Sin permiso de lectura no se abre el detalle.
    if (!allowRead) return;
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
      logCaughtError("Error deleting item:", error);
      notifyError(error, "No se pudo eliminar el elemento.");
    }
  };

  // Contenido de un renglón (título, descripción, derecha, menú y la línea de
  // datos). Igual en la lista del teléfono y en las tarjetas de la tableta.
  const renderRow = (item: T, index: number) => {
    const cardProps = renderCard({ item, index });
    const showView = allowRead && getMenuFlag(menu?.showView, item, true);
    const showEdit = allowUpdate && getMenuFlag(menu?.showEdit, item, true);
    const showDelete = allowDelete && getMenuFlag(menu?.showDelete, item, true);
    const hasBottom = cardProps.bottom && cardProps.bottom.length > 0;

    return (
      <View style={styles.listCardInner}>
        <View style={styles.cardMain}>
          {cardProps.left && (
            <View style={styles.cardLeft}>{cardProps.left}</View>
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

        {hasBottom && (
          <Text style={styles.bottomLine}>
            {cardProps.bottom!.map((b, idx) => (
              <Text key={idx}>
                {idx > 0 ? "  ·  " : ""}
                {!!b.label && <Text style={styles.bottomLabel}>{b.label} </Text>}
                <Text style={styles.bottomValue}>{b.value.toString()}</Text>
              </Text>
            ))}
          </Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container} onLayout={onContainerLayout}>
        <SearchBarComponent onChangeText={setSearchQuery} value={searchQuery} placeholder={searchPlaceholder} />

        {/* Barra de filtros */}
        {filters.length > 0 && (
          <View style={styles.filtersRow}>
            <AppListFilterBar
              filters={filters}
              values={activeFilters}
              onChange={handleFilterChange}
            />
          </View>
        )}

        <SkeletonListLoader />
      </View>
    );
  }

  return (
    <View style={styles.container} onLayout={onContainerLayout}>
      <SearchBarComponent onChangeText={setSearchQuery} value={searchQuery} placeholder={searchPlaceholder} />

      {/* Barra de filtros */}
      {filters.length > 0 && (
        <View style={styles.filtersRow}>
          <AppListFilterBar
            filters={filters}
            values={activeFilters}
            onChange={handleFilterChange}
          />
        </View>
      )}

      {data.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      ) : (
        <>
          <ScrollView
            style={[styles.scroll, filters.length > 0 && styles.scrollAfterFilters]}
            contentContainerStyle={
              numColumns > 1 && !shouldUseDataTable
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
                onRowPress={allowRead ? handleItemPress : undefined}
                renderActionsCell={(item) => (
                  // Un solo menú ⋮ por fila, como en las tarjetas (antes ojo,
                  // lápiz y bote de colores en cada renglón).
                  <ItemMenu
                    item={item}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onViewDetails={handleItemPress}
                    showView={allowRead && getMenuFlag(menu?.showView, item, true)}
                    showEdit={allowUpdate && getMenuFlag(menu?.showEdit, item, true)}
                    showDelete={allowDelete && getMenuFlag(menu?.showDelete, item, true)}
                    customActions={menu?.customActions}
                  />
                )}
              />
            ) : cardColumns > 1 ? (
              // Las tarjetas del teléfono en columnas (tableta): cada renglón
              // de la lista en su propia tarjeta, a la misma altura por fila.
              <View style={styles.cardGrid}>
                {(data || []).map((item, index) => (
                  <View
                    key={item.id}
                    style={[styles.cardGridCell, { width: `${100 / cardColumns}%` }]}
                  >
                    <TouchableRipple
                      onPress={() => handleItemPress(item)}
                      disabled={!allowRead}
                      style={styles.gridCard}
                    >
                      {renderRow(item, index)}
                    </TouchableRipple>
                  </View>
                ))}
              </View>
            ) : (
              // Una sola lista con separadores (antes, una tarjeta con sombra
              // por renglón: mucho ruido para leer muchos registros).
              <View style={styles.listGroup}>
              {(data || []).map((item, index) => (
                <TouchableRipple
                  key={item.id}
                  onPress={() => handleItemPress(item)}
                  disabled={!allowRead}
                  style={[styles.listCard, index > 0 && styles.listCardDivider]}
                >
                  {renderRow(item, index)}
                </TouchableRipple>
              ))}
              </View>
            )}
          </ScrollView>

          {/* Controles de paginación: en el teléfono el texto arriba de los
              botones; en tableta y web todo en un renglón. */}
          {pagination && (
            <View
              style={[
                styles.paginationContainer,
                isWide && styles.paginationContainerWide,
              ]}
            >
              <Text variant="bodySmall" style={styles.paginationText}>
                Mostrando {pagination.from ?? 0}–{pagination.to ?? 0} de{" "}
                {(pagination.total ?? 0).toLocaleString("es-MX")} elementos
              </Text>

              {pagination.last_page > 1 && (
                <View style={styles.paginationControls}>
                  <IconButton
                    icon="chevron-left"
                    size={18}
                    disabled={currentPage <= 1}
                    onPress={() => handlePageChange(currentPage - 1)}
                    style={styles.paginationArrow}
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
                    size={18}
                    disabled={currentPage >= pagination.last_page}
                    onPress={() => handlePageChange(currentPage + 1)}
                    style={styles.paginationArrow}
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
  placeholder?: string;
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
      placeholder={props.placeholder || "Buscar..."}
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
    // La separación con el buscador va en el ScrollView y no en su
    // contenido: si no, se desplazaba con la lista y los renglones quedaban
    // pegados al buscador al hacer scroll.
    scroll: {
      marginTop: tokens.spacing[3],
    },
    // La barra de filtros ya deja 8 abajo.
    scrollAfterFilters: {
      marginTop: tokens.spacing[1],
    },
    // Mismo margen lateral que el buscador y los filtros (16), para que la
    // lista quede alineada con ellos.
    scrollContainer: {
      paddingHorizontal: tokens.spacing[4],
      paddingBottom: tokens.spacing[4],
    },
    filtersRow: {
      marginTop: tokens.spacing[2],
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
      elevation: 0,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
    },
    card: {
      backgroundColor: c.surface,
    },
    cardContent: {
      padding: 0,
    },
    listGroup: {
      backgroundColor: c.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden" as const,
    },
    listCard: {
      backgroundColor: c.surface,
    },
    // Cuadrícula de tarjetas (tableta): el margen negativo compensa el
    // relleno lateral de cada celda, que hace de separación entre columnas;
    // así las tarjetas de las orillas quedan alineadas con el buscador.
    cardGrid: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      marginHorizontal: -6,
      rowGap: 12,
    },
    cardGridCell: {
      paddingHorizontal: 6,
    },
    gridCard: {
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden" as const,
    },
    listCardDivider: {
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    listCardInner: {
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    cardMain: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: tokens.spacing[3],
    },
    cardLeft: {
      justifyContent: "center" as const,
      flexShrink: 0,
    },
    cardCenter: {
      flex: 1,
      minWidth: 0,
    },
    cardRight: {
      justifyContent: "center" as const,
      flexShrink: 0,
    },
    // Datos extra en una sola línea discreta ("Fecha 14 oct · Sucursal …").
    bottomLine: {
      ...tokens.typography.caption,
      color: c.textSecondary,
      marginTop: 6,
      lineHeight: 18,
    },
    bottomLabel: {
      color: c.textMuted,
    },
    bottomValue: {
      color: c.textSecondary,
    },
    titleContainer: {
      marginBottom: 2,
    },
    cardTitle: {
      ...tokens.typography.bodyMd,
      color: c.text,
    },
    descriptionContainer: {},
    cardDescription: {
      ...tokens.typography.caption,
      color: c.textSecondary,
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
    // textMuted sin opacidad: con textSecondary al 60 % no llegaba a 3:1
    // sobre el fondo claro.
    paginationText: {
      color: c.textMuted,
    },
    paginationContainer: {
      alignItems: "center" as const,
      paddingHorizontal: tokens.spacing[4],
      paddingTop: tokens.spacing[1],
      paddingBottom: tokens.spacing[2],
      gap: 2,
    },
    // Tableta y web: el texto a la izquierda y los botones a la derecha.
    paginationContainerWide: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      paddingVertical: tokens.spacing[2],
      gap: tokens.spacing[3],
    },
    paginationControls: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 2,
    },
    paginationArrow: {
      margin: 0,
      width: 32,
      height: 32,
    },
    paginationPageButton: {
      minWidth: 32,
      height: 32,
      paddingHorizontal: 6,
      borderRadius: 16,
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
      // `onPrimary` no existe en la paleta (siempre caía en #fff, ilegible
      // sobre el verde claro del modo oscuro).
      color: c.primaryForeground,
    },
    paginationEllipsis: {
      color: c.textSecondary,
      paddingHorizontal: 4,
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
