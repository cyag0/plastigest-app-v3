import { FormDatePicker } from "@/components/Form/AppDatePicker";
import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormProSelect } from "@/components/Form/AppProSelect/AppProSelect";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import useSelectedCompany from "@/hooks/useSelectedCompany";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFormikContext } from "formik";
import React, { useRef, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  IconButton,
  Portal,
  Searchbar,
  Text,
} from "react-native-paper";
import * as Yup from "yup";

interface ProductDetail {
  product_id: number;
  product_name?: string;
  quantity_requested: string;
  notes?: string;
  current_stock?: number;
  unit_name?: string;
}

interface PetitionFormData {
  from_location_id: number;
  to_location_id: number;
  company_id: number;
  requested_at: string;
  notes?: string;
  details: ProductDetail[];
}

// Componente interno para manejar la lógica de productos
function ProductsSection() {
  const { values, setFieldValue } = useFormikContext<PetitionFormData>();
  const alerts = useAlerts();
  const details = values.details || [];
  const [productImages, setProductImages] = useState<{ [key: number]: any }>(
    {}
  );
  const [productStocks, setProductStocks] = useState<{ [key: number]: any }>(
    {}
  );
  const [productData, setProductData] = useState<{ [key: number]: any }>({});

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Cargar productos disponibles con stock
  const loadAvailableProducts = async () => {
    if (!values.from_location_id) return;

    setLoadingProducts(true);
    try {
      const response = await Services.products.index({
        location_id: values.from_location_id,
        with_stock: true, // Filtro para productos con stock
      });

      const products = Array.isArray(response.data)
        ? response.data
        : (response.data as any)?.data || [];
      setAvailableProducts(products);
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleAddProduct = () => {
    if (!values.from_location_id) return;
    loadAvailableProducts();
    setShowModal(true);
  };

  const handleSelectProduct = (product: any) => {
    // Verificar si ya está seleccionado
    const alreadySelected = details.some((d) => d.product_id === product.id);
    if (alreadySelected) {
      return;
    }

    const newProduct: ProductDetail = {
      product_id: product.id,
      product_name: product.name,
      quantity_requested: "1",
      notes: "",
      current_stock: product.current_stock || 0,
      unit_name: product.unit?.abbreviation || product.unit?.name || "ud",
    };

    const newIndex = details.length;
    setFieldValue("details", [...details, newProduct]);

    // Guardar imagen y stock
    if (product.main_image) {
      setProductImages({ ...productImages, [newIndex]: product.main_image });
    }
    setProductStocks({
      ...productStocks,
      [newIndex]: {
        current_stock: product.current_stock || 0,
        unit_name: product.unit?.abbreviation || product.unit?.name || "ud",
      },
    });
    setProductData({ ...productData, [newIndex]: product });

    // Mostrar alerta de éxito
    alerts.success(`Producto "${product.name}" agregado`);

    setShowModal(false);
    setSearchQuery("");
  };

  const handleRemoveProduct = async (index: number) => {
    const productName = details[index]?.product_name || "este producto";

    const res = await alerts.confirm(`¿Eliminar producto?`);

    if (res) {
      const updatedDetails = details.filter((_, i) => i !== index);
      setFieldValue("details", updatedDetails);
      // Mostrar alerta después del setFieldValue con un pequeño delay
      setTimeout(() => {
        alerts.success("Producto eliminado");
      }, 100);
    }
  };

  // Incrementar cantidad
  const handleIncrement = (index: number) => {
    const currentQty = parseFloat(
      values.details[index]?.quantity_requested || "0"
    );
    const maxStock = productStocks[index]?.current_stock || 0;
    if (currentQty < maxStock) {
      setFieldValue(
        `details.${index}.quantity_requested`,
        (currentQty + 1).toString()
      );
    }
  };

  // Decrementar cantidad
  const handleDecrement = (index: number) => {
    const currentQty = parseFloat(
      values.details[index]?.quantity_requested || "0"
    );
    if (currentQty > 1) {
      setFieldValue(
        `details.${index}.quantity_requested`,
        (currentQty - 1).toString()
      );
    }
  };

  // Filtrar productos en búsqueda
  const filteredProducts = availableProducts.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code?.toLowerCase().includes(searchQuery.toLowerCase());
    const notSelected = !details.some((d) => d.product_id === p.id);
    return matchesSearch && notSelected;
  });

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <MaterialCommunityIcons
              name="package-variant"
              size={24}
              color={palette.primary}
            />
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Productos Solicitados
            </Text>
          </View>
          <Button
            mode="contained"
            onPress={handleAddProduct}
            icon="plus"
            compact
            style={styles.addButton}
            labelStyle={{ fontSize: 12 }}
            disabled={!values.from_location_id}
          >
            Agregar
          </Button>
        </View>

        {!values.from_location_id ? (
          <View style={styles.blockedContainer}>
            <MaterialCommunityIcons
              name="lock-outline"
              size={64}
              color={palette.warning}
              style={{ opacity: 0.5 }}
            />
            <Text variant="titleMedium" style={styles.blockedTitle}>
              Sección Bloqueada
            </Text>
            <Text style={styles.blockedText}>
              Primero debes seleccionar la{" "}
              <Text style={styles.blockedTextBold}>Sucursal de Origen</Text>{" "}
              para poder agregar productos.
            </Text>
            <View style={styles.blockedSteps}>
              <View style={styles.blockedStep}>
                <MaterialCommunityIcons
                  name="numeric-1-circle"
                  size={24}
                  color={palette.primary}
                />
                <Text style={styles.blockedStepText}>
                  Selecciona la sucursal de origen arriba
                </Text>
              </View>
              <View style={styles.blockedStep}>
                <MaterialCommunityIcons
                  name="numeric-2-circle"
                  size={24}
                  color={palette.textSecondary}
                />
                <Text style={styles.blockedStepText}>
                  Luego podrás agregar productos con el botón "Agregar"
                </Text>
              </View>
            </View>
          </View>
        ) : details.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="package-variant-closed"
              size={48}
              color={palette.textSecondary}
              style={{ opacity: 0.3 }}
            />
            <Text style={styles.emptyText}>
              Presiona "Agregar" para seleccionar productos
            </Text>
          </View>
        ) : null}

        {details.map((detail, index) => (
          <Card key={index} style={styles.productCard}>
            <Card.Content style={styles.productCardContent}>
              {/* Header con imagen y nombre en fila */}
              <View style={styles.productMainRow}>
                <View style={styles.productImageContainer}>
                  {productImages[index]?.uri ? (
                    <Image
                      source={{ uri: productImages[index].uri }}
                      style={styles.productImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <MaterialCommunityIcons
                        name="image-outline"
                        size={32}
                        color={palette.textSecondary}
                      />
                    </View>
                  )}
                </View>

                <View style={styles.productInfoRow}>
                  <View style={styles.productNameContainer}>
                    <Text variant="titleMedium" style={styles.productName}>
                      {detail.product_name}
                    </Text>
                    {detail.current_stock !== undefined && (
                      <View
                        style={[
                          styles.stockBadge,
                          detail.current_stock > 0
                            ? styles.stockBadgeSuccess
                            : styles.stockBadgeError,
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="package-variant"
                          size={14}
                          color={"#fff"}
                        />
                        <Text style={styles.stockBadgeText}>
                          Stock: {detail.current_stock} {detail.unit_name}
                        </Text>
                      </View>
                    )}
                  </View>
                  <IconButton
                    icon="close-circle"
                    size={24}
                    iconColor={palette.error}
                    onPress={() => handleRemoveProduct(index)}
                    style={styles.removeButton}
                  />
                </View>
              </View>

              {/* Controles debajo */}
              <View style={styles.productControlsSection}>
                {/* Cantidad con botones */}
                <View style={styles.quantityContainer}>
                  <Text style={styles.quantityLabel}>Cantidad</Text>
                  <View style={styles.quantityControls}>
                    <IconButton
                      icon="minus-circle"
                      size={32}
                      iconColor={palette.primary}
                      onPress={() => handleDecrement(index)}
                      disabled={parseFloat(detail.quantity_requested) <= 1}
                      style={styles.quantityButton}
                    />
                    <View style={styles.quantityDisplay}>
                      <Text style={styles.quantityValue}>
                        {detail.quantity_requested || "0"}
                      </Text>
                      {detail.unit_name && (
                        <Text style={styles.quantityUnit}>
                          {detail.unit_name}
                        </Text>
                      )}
                    </View>
                    <IconButton
                      icon="plus-circle"
                      size={32}
                      iconColor={palette.primary}
                      onPress={() => handleIncrement(index)}
                      disabled={
                        !detail.current_stock ||
                        parseFloat(detail.quantity_requested) >=
                          detail.current_stock
                      }
                      style={styles.quantityButton}
                    />
                  </View>
                  {detail.current_stock &&
                    parseFloat(detail.quantity_requested) >
                      detail.current_stock && (
                      <View style={styles.errorContainer}>
                        <MaterialCommunityIcons
                          name="alert-circle"
                          size={14}
                          color={palette.error}
                        />
                        <Text style={styles.errorTextInline}>
                          La cantidad excede el stock disponible
                        </Text>
                      </View>
                    )}
                </View>

                <FormInput
                  name={`details.${index}.notes`}
                  label="Notas (opcional)"
                  placeholder="Observaciones..."
                  multiline
                  numberOfLines={2}
                />
              </View>
            </Card.Content>
          </Card>
        ))}

        {/* Modal de selección de productos */}
        <Portal>
          <Modal
            visible={showModal}
            onDismiss={() => {
              setShowModal(false);
              setSearchQuery("");
            }}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text variant="titleLarge" style={styles.modalTitle}>
                  Seleccionar Producto
                </Text>
                <IconButton
                  icon="close"
                  size={24}
                  onPress={() => {
                    setShowModal(false);
                    setSearchQuery("");
                  }}
                />
              </View>

              <Searchbar
                placeholder="Buscar por nombre o código"
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={styles.searchbar}
              />

              {loadingProducts ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="large" color={palette.primary} />
                  <Text style={styles.modalLoadingText}>
                    Cargando productos...
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={filteredProducts}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.modalProductItem}
                      onPress={() => handleSelectProduct(item)}
                    >
                      <View style={styles.modalProductImage}>
                        {item.main_image?.uri ? (
                          <Image
                            source={{ uri: item.main_image.uri }}
                            style={styles.productImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.imagePlaceholder}>
                            <MaterialCommunityIcons
                              name="image-outline"
                              size={28}
                              color={palette.textSecondary}
                            />
                          </View>
                        )}
                      </View>
                      <View style={styles.modalProductInfo}>
                        <Text
                          variant="titleSmall"
                          style={styles.modalProductName}
                        >
                          {item.name}
                        </Text>
                        {item.code && (
                          <Text
                            variant="bodySmall"
                            style={styles.modalProductCode}
                          >
                            Código: {item.code}
                          </Text>
                        )}
                        <View style={styles.modalProductStock}>
                          <MaterialCommunityIcons
                            name="package-variant"
                            size={16}
                            color={
                              item.current_stock > 0
                                ? palette.success
                                : palette.error
                            }
                          />
                          <Text
                            style={[
                              styles.modalProductStockText,
                              {
                                color:
                                  item.current_stock > 0
                                    ? palette.success
                                    : palette.error,
                              },
                            ]}
                          >
                            Stock: {item.current_stock}{" "}
                            {item.unit?.abbreviation || item.unit?.name || "ud"}
                          </Text>
                        </View>
                      </View>
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={24}
                        color={palette.textSecondary}
                      />
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View style={styles.modalEmpty}>
                      <MaterialCommunityIcons
                        name="package-variant-closed"
                        size={48}
                        color={palette.textSecondary}
                        style={{ opacity: 0.3 }}
                      />
                      <Text style={styles.modalEmptyText}>
                        {searchQuery
                          ? "No se encontraron productos"
                          : "No hay productos con stock disponible"}
                      </Text>
                    </View>
                  }
                />
              )}
            </View>
          </Modal>
        </Portal>
      </Card.Content>
    </Card>
  );
}

// Componente para manejar la selección de ubicaciones (para peticiones)
function LocationSelector() {
  const { location } = useAuth(); // Obtener ubicación actual del usuario
  const { company } = useSelectedCompany();

  return (
    <>
      <FormProSelect
        name="from_location_id"
        label="Sucursal Origen"
        model="admin.locations"
        placeholder="¿De qué sucursal solicitas los productos?"
        fetchParams={{
          company_id: company?.id,
        }}
        required
      />

      {/* Mostrar ubicación actual del usuario (destino) */}
      <View style={styles.currentLocationCard}>
        <View style={styles.currentLocationHeader}>
          <MaterialCommunityIcons
            name="map-marker-check"
            size={24}
            color={palette.success}
          />
          <Text variant="labelMedium" style={styles.currentLocationLabel}>
            TU UBICACIÓN (DESTINO)
          </Text>
        </View>
        <Text variant="titleMedium" style={styles.currentLocationText}>
          {location?.name || "No definida"}
        </Text>
        {location?.address && (
          <Text variant="bodySmall" style={styles.currentLocationAddress}>
            {location.address}
          </Text>
        )}
      </View>
    </>
  );
}

export default function PetitionForm() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const alerts = useAlerts();
  const { company } = useSelectedCompany();
  const { location } = useAuth(); // Obtener ubicación del contexto
  const formRef = useRef<AppFormRef<PetitionFormData>>(null);

  const petitionId = params.id ? parseInt(params.id as string) : undefined;

  return (
    <View style={styles.container}>
      <AppForm
        ref={formRef}
        api={Services.transfers}
        id={petitionId}
        initialValues={{
          from_location_id: 0,
          to_location_id: location?.id || 0, // Usar ubicación del contexto
          company_id: company?.id || 0,
          requested_at: new Date().toISOString().split("T")[0],
          notes: "",
          details: [],
          status: "ordered",
        }}
        validationSchema={Yup.object().shape({})}
        onSubmit={async (values: any, formInstance) => {
          // Validar campos manualmente antes de enviar
          const fromLocationId = parseInt(
            values.get("from_location_id") || "0"
          );
          const toLocationId = parseInt(values.get("to_location_id") || "0");
          const requestedAt = values.get("requested_at");

          if (!fromLocationId || fromLocationId === 0) {
            alerts.error("Debes seleccionar la sucursal de origen");
            return;
          }

          if (!toLocationId || toLocationId === 0) {
            alerts.error("La ubicación de destino no está definida");
            return;
          }

          if (fromLocationId === toLocationId) {
            alerts.error("No puedes solicitar productos de la misma sucursal");
            return;
          }

          if (!requestedAt) {
            alerts.error("Debes seleccionar la fecha de solicitud");
            return;
          }

          // Contar cuántos productos hay
          let productCount = 0;
          let index = 0;
          while (values.has(`details[${index}][product_id]`)) {
            productCount++;
            index++;
          }

          if (productCount === 0) {
            alerts.error("Debes agregar al menos un producto a la petición");
            return;
          }

          // Validar cada producto
          for (let i = 0; i < productCount; i++) {
            const productId = parseInt(
              values.get(`details[${i}][product_id]`) || "0"
            );
            const quantityRequested = parseFloat(
              values.get(`details[${i}][quantity_requested]`) || "0"
            );
            const currentStock = parseFloat(
              values.get(`details[${i}][current_stock]`) || "0"
            );

            if (!productId || productId === 0) {
              alerts.error(`Producto #${i + 1}: Debes seleccionar un producto`);
              return;
            }

            if (!quantityRequested || quantityRequested <= 0) {
              alerts.error(
                `Producto #${i + 1}: La cantidad debe ser mayor a 0`
              );
              return;
            }

            if (currentStock && quantityRequested > currentStock) {
              alerts.error(
                `Producto #${
                  i + 1
                }: La cantidad solicitada (${quantityRequested}) excede el stock disponible (${currentStock})`
              );
              return;
            }
          }

          // Mostrar confirmación
          const confirmed = await alerts.confirm(
            `¿Crear petición de ${productCount} producto(s)?`
          );

          if (!confirmed) {
            return;
          }

          try {
            await Services.transfers.store(values);
            alerts.success("Petición creada correctamente");
            router.back();
          } catch (error: any) {
            alerts.error(
              "Error al crear la petición: " +
                (error.response?.data?.message ||
                  error.message ||
                  "Error desconocido")
            );
          }
        }}
        showSubmitButton={true}
        submitButtonText="Crear Petición"
      >
        <ScrollView style={styles.formContent}>
          {/* Header */}
          <View style={styles.header}>
            <MaterialCommunityIcons
              name="file-document-edit"
              size={48}
              color={palette.primary}
            />
            <Text variant="headlineMedium" style={styles.title}>
              Nueva Petición
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Solicita productos de otra sucursal
            </Text>
          </View>

          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                  name="map-marker-path"
                  size={24}
                  color={palette.primary}
                />
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Ubicaciones
                </Text>
              </View>

              <LocationSelector />
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                  name="calendar-clock"
                  size={24}
                  color={palette.primary}
                />
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Información General
                </Text>
              </View>

              <FormDatePicker
                name="requested_at"
                label="Fecha de Solicitud"
                placeholder="Selecciona la fecha"
                required
              />

              <FormInput
                name="notes"
                label="Notas"
                placeholder="Observaciones adicionales sobre la petición (opcional)"
                multiline
                numberOfLines={3}
              />
            </Card.Content>
          </Card>

          <ProductsSection />
        </ScrollView>
      </AppForm>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  formContent: {
    padding: 0,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
    paddingVertical: 16,
  },
  title: {
    fontWeight: "bold",
    color: palette.text,
    marginTop: 12,
  },
  subtitle: {
    color: palette.textSecondary,
    marginTop: 4,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 12,
    backgroundColor: "#fff",
    shadowColor: "transparent",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    color: palette.primary,
    fontWeight: "600",
  },
  currentLocationCard: {
    padding: 16,
    backgroundColor: palette.success + "10",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: palette.success,
    marginTop: 12,
  },
  currentLocationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  currentLocationLabel: {
    color: palette.success,
    fontWeight: "700",
    fontSize: 12,
  },
  currentLocationText: {
    color: palette.text,
    fontWeight: "600",
    marginLeft: 32,
  },
  currentLocationAddress: {
    color: palette.textSecondary,
    marginLeft: 32,
    marginTop: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addButton: {
    backgroundColor: palette.primary,
    borderRadius: 8,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 12,
  },
  emptyText: {
    textAlign: "center",
    color: palette.textSecondary,
    fontStyle: "italic",
    fontSize: 14,
  },
  productCard: {
    marginBottom: 16,
    backgroundColor: "#fafafa",
    elevation: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  productCardContent: {
    padding: 0,
  },
  productHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  productNumberBadge: {
    backgroundColor: palette.primary,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  productNumber: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  removeButton: {
    margin: 0,
  },
  productContentRow: {
    flexDirection: "row",
    gap: 12,
  },
  productImageContainer: {
    width: 100,
    height: 100,
  },
  productImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    backgroundColor: "#e9ecef",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#dee2e6",
    borderStyle: "dashed",
  },
  productFormContainer: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  halfWidth: {
    flex: 1,
  },
  warningContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: palette.warning + "15",
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
    marginBottom: 8,
  },
  warningText: {
    color: palette.warning,
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  errorText: {
    color: palette.error,
    fontSize: 12,
    marginTop: 4,
    fontWeight: "500",
  },
  infoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: palette.info + "15",
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
    marginBottom: 8,
  },
  infoText: {
    color: palette.info,
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  stockContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f8f9fa",
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  stockText: {
    fontSize: 13,
    fontWeight: "600",
  },
  quantityContainer: {
    marginBottom: 12,
  },
  quantityLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: palette.text,
    marginBottom: 8,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  quantityButton: {
    margin: 0,
  },
  quantityDisplay: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
    paddingHorizontal: 16,
  },
  quantityValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: palette.primary,
  },
  quantityUnit: {
    fontSize: 12,
    color: palette.textSecondary,
    marginTop: 2,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  errorTextInline: {
    color: palette.error,
    fontSize: 11,
    fontWeight: "500",
  },
  blockedContainer: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 16,
  },
  blockedTitle: {
    fontWeight: "bold",
    color: palette.warning,
    marginTop: 8,
  },
  blockedText: {
    textAlign: "center",
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  blockedTextBold: {
    fontWeight: "bold",
    color: palette.text,
  },
  blockedSteps: {
    marginTop: 16,
    gap: 12,
    width: "100%",
  },
  blockedStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
  },
  blockedStepText: {
    flex: 1,
    fontSize: 13,
    color: palette.text,
  },
  productMainRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  productInfoRow: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  productNameContainer: {
    flex: 1,
    gap: 6,
  },
  productName: {
    fontWeight: "600",
    color: palette.text,
  },
  stockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  stockBadgeSuccess: {
    backgroundColor: palette.success,
  },
  stockBadgeError: {
    backgroundColor: palette.error,
  },
  stockBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  productControlsSection: {
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
    paddingTop: 12,
  },
  modalContainer: {
    backgroundColor: "white",
    margin: 20,
    borderRadius: 16,
    maxHeight: "80%",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  modalTitle: {
    fontWeight: "bold",
    color: palette.text,
  },
  searchbar: {
    margin: 16,
    elevation: 0,
    backgroundColor: "#f8f9fa",
  },
  modalLoading: {
    padding: 48,
    alignItems: "center",
    gap: 16,
  },
  modalLoadingText: {
    color: palette.textSecondary,
  },
  modalProductItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f5",
  },
  modalProductImage: {
    width: 60,
    height: 60,
  },
  modalProductInfo: {
    flex: 1,
    gap: 4,
  },
  modalProductName: {
    fontWeight: "600",
    color: palette.text,
  },
  modalProductCode: {
    color: palette.textSecondary,
  },
  modalProductStock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  modalProductStockText: {
    fontSize: 12,
    fontWeight: "600",
  },
  modalEmpty: {
    padding: 48,
    alignItems: "center",
    gap: 16,
  },
  modalEmptyText: {
    textAlign: "center",
    color: palette.textSecondary,
    fontSize: 14,
  },
});
