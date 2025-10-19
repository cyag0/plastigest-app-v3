import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import CategoriesForm from "../form";

export default function CategoryDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const categoryId = parseInt(params.id as string);

  return <CategoriesForm id={categoryId} readonly />;
}

/* export default function CategoryDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const categoryId = parseInt(params.id as string);

  const [category, setCategory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategory = async () => {
      try {
        setLoading(true);
        const response = await Services.categories.show(categoryId);
        setCategory(response.data);
      } catch (err) {
        setError("Error al cargar la categoría");
      } finally {
        setLoading(false);
      }
    };

    fetchCategory();
  }, [categoryId]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 16 }}>Cargando categoría...</Text>
      </View>
    );
  }

  if (error || !category) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Error al cargar la categoría</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, padding: 16 }}>
        <Card style={{ marginBottom: 16 }}>
          <Card.Content>
            <Text variant="titleLarge" style={{ marginBottom: 8 }}>
              {category.name}
            </Text>

            <View style={{ marginBottom: 16 }}>
              <Chip
                mode="outlined"
                icon={category.is_active ? "check-circle" : "cancel"}
                style={{
                  backgroundColor: category.is_active ? "#e8f5e8" : "#ffebee",
                  alignSelf: "flex-start",
                }}
              >
                {category.is_active ? "Activa" : "Inactiva"}
              </Chip>
            </View>

            {category.description && (
              <View style={{ marginBottom: 16 }}>
                <Text
                  variant="labelMedium"
                  style={{ color: "#666", marginBottom: 4 }}
                >
                  Descripción
                </Text>
                <Text variant="bodyMedium">{category.description}</Text>
              </View>
            )}

            {category.company && (
              <View style={{ marginBottom: 16 }}>
                <Text
                  variant="labelMedium"
                  style={{ color: "#666", marginBottom: 4 }}
                >
                  Empresa
                </Text>
                <Text variant="bodyMedium">{category.company.name}</Text>
              </View>
            )}

            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <View>
                <Text variant="labelMedium" style={{ color: "#666" }}>
                  Creada
                </Text>
                <Text variant="bodySmall">
                  {new Date(category.created_at).toLocaleDateString()}
                </Text>
              </View>

              <View>
                <Text variant="labelMedium" style={{ color: "#666" }}>
                  Actualizada
                </Text>
                <Text variant="bodySmall">
                  {new Date(category.updated_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
}
 */
