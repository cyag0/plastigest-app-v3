import EmptyState from "@/components/App/EmptyState";
import SearchInput from "@/components/App/SearchInput";
import AppModal, { AppModalConfig } from "@/components/Feedback/Modal/AppModal";
import { FormInput } from "@/components/Form/AppInput";
import palette from "@/constants/palette";
import useDebounce from "@/hooks/useDebounce";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Button, Checkbox, Text } from "react-native-paper";

/**
 * Configuración para abrir el modal de selección de fórmulas.
 */
export interface FormulaPickerConfig {
  /** Título del modal. */
  title?: string;
  /**
   * Callback que recibe las fórmulas seleccionadas y la cantidad de unidades
   * producidas (multiplicador). El front se encarga de mergear consumos y
   * outputs en el formulario.
   */
  onSelect: (
    formulas: App.Entities.Formula[],
    unitsProduced: number,
  ) => void;
  /** Multiplicador inicial (default 1). */
  defaultUnits?: number;
}

/**
 * Ref imperativo del modal (mismo patrón que AppModal).
 */
export interface FormulaPickerModalRef {
  show: (config: FormulaPickerConfig) => void;
  hide: () => void;
  isVisible: () => boolean;
}

interface FormulaListItemProps {
  formula: App.Entities.Formula;
  selected: boolean;
  onToggle: () => void;
}

function FormulaListItem({ formula, selected, onToggle }: FormulaListItemProps) {
  // La imagen de la fórmula es la del producto objetivo.
  const imageUri = formula.product?.main_image?.uri;
  const productName = formula.product?.name ?? formula.product_name ?? "—";
  const productCode = formula.product?.code ?? formula.product_code ?? "";
  const itemCount = formula.items?.length ?? 0;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onToggle}
      style={[styles.itemRow, selected && styles.itemRowSelected]}
    >
      <Checkbox.Android
        status={selected ? "checked" : "unchecked"}
        onPress={onToggle}
        color={palette.primary}
      />
      <View style={styles.itemImageWrap}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.itemImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.itemImagePlaceholder}>
            <MaterialCommunityIcons
              name="flask-outline"
              size={24}
              color={palette.textMuted}
            />
          </View>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text
          variant="bodyMedium"
          numberOfLines={1}
          style={{ color: palette.text, fontWeight: "600" }}
        >
          {formula.name}
        </Text>
        <Text
          variant="bodySmall"
          numberOfLines={1}
          style={{ color: palette.textSecondary }}
        >
          {productName}
          {productCode ? ` · ${productCode}` : ""}
        </Text>
        <Text
          variant="bodySmall"
          style={{ color: palette.textMuted, fontSize: 11, marginTop: 2 }}
        >
          {itemCount} ingrediente{itemCount === 1 ? "" : "s"}
          {formula.version ? ` · v${formula.version}` : ""}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const FormulaPickerModal = forwardRef<FormulaPickerModalRef>((_props, ref) => {
  const modalRef = useRef<{ show: (c?: AppModalConfig) => void; hide: () => void; isVisible: () => boolean }>(null);

  const [config, setConfig] = useState<FormulaPickerConfig | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [formulas, setFormulas] = useState<App.Entities.Formula[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Map<number, App.Entities.Formula>>(
    new Map(),
  );
  const [unitsProduced, setUnitsProduced] = useState<string>("1");

  const { run: runSearchDebounce, cancel: cancelSearchDebounce } = useDebounce(
    (value: string) => setDebouncedSearch(value),
    { time: 300 },
  );

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearch(text);
      runSearchDebounce(text);
    },
    [runSearchDebounce],
  );

  // Fetch fórmulas cuando cambia el search.
  useEffect(() => {
    if (!config) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const params: Record<string, any> = {
          is_active: true,
        };
        if (debouncedSearch.trim()) {
          params.search = debouncedSearch.trim();
        }
        // El CrudController retorna todos los registros por default y el
        // FormulaController ya carga 'items.product' y 'product.mainImage'
        // en indexRelations.
        const res: any = await Services.formulas.index(params);
        const list: App.Entities.Formula[] =
          (res?.data?.data as App.Entities.Formula[]) ??
          (res?.data as App.Entities.Formula[]) ??
          [];
        if (!cancelled) setFormulas(Array.isArray(list) ? list : []);
      } catch (e) {
        console.warn("Error cargando fórmulas en FormulaPickerModal", e);
        if (!cancelled) setFormulas([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, config]);

  // Resetear estado al ocultar.
  const handleHide = useCallback(() => {
    modalRef.current?.hide();
    setTimeout(() => {
      setSearch("");
      setDebouncedSearch("");
      setSelected(new Map());
      setFormulas([]);
      setConfig(null);
      setUnitsProduced("1");
      cancelSearchDebounce();
    }, 200);
  }, [cancelSearchDebounce]);

  useImperativeHandle(
    ref,
    () => ({
      show: (cfg: FormulaPickerConfig) => {
        setConfig(cfg);
        setSelected(new Map());
        setSearch("");
        setDebouncedSearch("");
        setUnitsProduced(
          cfg.defaultUnits && cfg.defaultUnits > 0
            ? String(cfg.defaultUnits)
            : "1",
        );
        modalRef.current?.show({
          title: cfg.title ?? "Seleccionar fórmulas",
          showCloseButton: true,
          dismissable: true,
          width: "92%",
          height: "88%",
          defaultActions: false,
        });
      },
      hide: handleHide,
      isVisible: () => modalRef.current?.isVisible() ?? false,
    }),
    [handleHide],
  );

  const toggleFormula = useCallback(
    (formula: App.Entities.Formula) => {
      setSelected((prev) => {
        const next = new Map(prev);
        if (next.has(formula.id)) {
          next.delete(formula.id);
        } else {
          next.set(formula.id, formula);
        }
        return next;
      });
    },
    [],
  );

  const parsedUnits = useMemo(() => {
    const n = Number(unitsProduced);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }, [unitsProduced]);

  const handleConfirm = useCallback(() => {
    if (!config) return;
    const selectedArray = Array.from(selected.values());
    if (selectedArray.length > 0) {
      config.onSelect(selectedArray, parsedUnits);
    }
    handleHide();
  }, [config, selected, parsedUnits, handleHide]);

  const renderItem = useCallback(
    ({ item }: { item: App.Entities.Formula }) => (
      <FormulaListItem
        formula={item}
        selected={selected.has(item.id)}
        onToggle={() => toggleFormula(item)}
      />
    ),
    [selected, toggleFormula],
  );

  const keyExtractor = useCallback(
    (item: App.Entities.Formula) => `fp-${item.id}`,
    [],
  );

  const selectedCount = selected.size;
  const canConfirm = selectedCount > 0 && parsedUnits > 0;

  const emptyState = useMemo(
    () => (
      <View style={styles.emptyWrap}>
        <EmptyState
          icon="magnify-close"
          title="Sin fórmulas"
          description={
            debouncedSearch
              ? `No encontramos fórmulas que coincidan con “${debouncedSearch}”.`
              : "No hay fórmulas activas disponibles."
          }
          compact
        />
      </View>
    ),
    [debouncedSearch],
  );

  return (
    <AppModal ref={modalRef}>
      {() => (
        <View style={styles.container}>
          <View style={{ paddingBottom: 12 }}>
            <SearchInput
              placeholder="Buscar fórmula por nombre, descripción o producto…"
              value={search}
              onChangeText={handleSearchChange}
              autoCorrect={false}
              autoCapitalize="none"
              showShortcut={false}
              width="100%"
            />
          </View>

          <View style={styles.unitsRow}>
            <Text style={{ color: palette.text, fontWeight: "600", flex: 1 }}>
              Unidades producidas
            </Text>
            <View style={styles.unitsInputWrap}>
              <FormInput
                name="__units_produced__"
                value={unitsProduced}
                onChangeText={setUnitsProduced}
                placeholder="1"
                keyboardType="numeric"
                hideLabel
              />
            </View>
          </View>

          <View style={styles.listWrap}>
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={palette.primary} size="large" />
                <Text style={{ color: palette.textSecondary, marginTop: 8 }}>
                  Cargando fórmulas…
                </Text>
              </View>
            ) : formulas.length === 0 ? (
              emptyState
            ) : (
              <FlatList
                data={formulas}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                contentContainerStyle={{ paddingBottom: 8 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator
              />
            )}
          </View>

          <View style={styles.footer}>
            <Text style={{ color: palette.textSecondary, flex: 1 }}>
              {selectedCount === 0
                ? "Selecciona una o más fórmulas"
                : `${selectedCount} fórmula${selectedCount === 1 ? "" : "s"} · ${parsedUnits} unidad${
                    parsedUnits === 1 ? "" : "es"
                  }`}
            </Text>
            <Button
              mode="outlined"
              onPress={handleHide}
              style={{ marginRight: 8 }}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleConfirm}
              disabled={!canConfirm}
              buttonColor={palette.primary}
              textColor="#fff"
            >
              Agregar
            </Button>
          </View>
        </View>
      )}
    </AppModal>
  );
});

FormulaPickerModal.displayName = "FormulaPickerModal";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 400,
  },
  unitsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: palette.surfaceMuted,
  },
  unitsInputWrap: {
    width: 90,
  },
  listWrap: {
    flex: 1,
    minHeight: 200,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    marginBottom: 8,
  },
  itemRowSelected: {
    borderColor: palette.primary,
    backgroundColor: palette.primarySoft,
  },
  itemImageWrap: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 10,
    backgroundColor: palette.surfaceMuted,
  },
  itemImage: {
    width: "100%",
    height: "100%",
  },
  itemImagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.surfaceMuted,
  },
  loadingWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyWrap: {
    paddingVertical: 16,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    marginTop: 4,
  },
});

export default FormulaPickerModal;
