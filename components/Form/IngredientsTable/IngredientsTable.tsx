import { FormInput } from "@/components/Form/AppInput";
import { FormProSelect } from "@/components/Form/AppProSelect/AppProSelect";
import palette from "@/constants/palette";
import { useAlerts } from "@/hooks/useAlerts";
import { Ionicons } from "@expo/vector-icons";
import { getIn, useFormikContext } from "formik";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Button } from "react-native-paper";
import { useAppForm } from "../AppForm/AppForm";
import { InputLabel } from "../AppForm/hoc";

interface Ingredient {
  id: string;
  ingredient_id: number;
  quantity: number;
  notes?: string;
}

interface IngredientsTableProps {
  name: string;
  label?: string;
  required?: boolean;
}

export default function IngredientsTable({
  name,
  label = "Ingredientes",
  required = false,
}: IngredientsTableProps) {
  const { values, setFieldValue } = useFormikContext();
  const alert = useAlerts();
  const ingredients: Ingredient[] = getIn(values, name) || [];

  const formContext = useAppForm();
  const readonly = formContext?.readonly || false;

  const addIngredient = () => {
    const newIngredient: Ingredient = {
      id: Date.now().toString(),
      ingredient_id: 0,
      quantity: 0,
      notes: "",
    };

    const updatedIngredients = [...ingredients, newIngredient];
    setFieldValue(name, updatedIngredients);

    alert.success("Ingrediente agregado exitosamente");
  };

  const removeIngredient = async (id: string) => {
    const res = await alert.confirm(
      "¿Está seguro que desea eliminar este ingrediente?",
      {
        title: "Confirmar eliminación",
      }
    );

    if (res) {
      const updatedIngredients = ingredients.filter(
        (ingredient) => ingredient.id !== id
      );
      setFieldValue(name, updatedIngredients);
    }
  };

  return (
    <View style={{ marginBottom: 16 }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <InputLabel label={label} required={required} />
        {!readonly && (
          <Button icon={"plus"} onPress={addIngredient} mode="contained">
            Agregar
          </Button>
        )}
      </View>

      {/* Table */}
      {ingredients.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{
            borderWidth: 1,
            borderColor: "#E5E7EB",
            borderRadius: 8,
          }}
        >
          <View style={{ minWidth: 600 }}>
            {/* Table Header */}
            <View
              style={{
                flexDirection: "row",
                backgroundColor: "#F9FAFB",
                paddingVertical: 12,
                paddingHorizontal: 8,
                borderBottomWidth: 1,
                borderBottomColor: "#E5E7EB",
              }}
            >
              <Text
                style={{
                  flex: 3,
                  fontWeight: "600",
                  color: "#374151",
                  fontSize: 14,
                }}
              >
                Materia Prima
              </Text>
              <Text
                style={{
                  flex: 1,
                  fontWeight: "600",
                  color: "#374151",
                  fontSize: 14,
                  textAlign: "center",
                }}
              >
                Cantidad
              </Text>
              <Text
                style={{
                  flex: 2,
                  fontWeight: "600",
                  color: "#374151",
                  fontSize: 14,
                }}
              >
                Notas
              </Text>
              <View style={{ width: 50 }} />
            </View>

            {/* Table Rows */}
            {(ingredients || []).map((ingredient, index) => (
              <View
                key={ingredient.id}
                style={{
                  flexDirection: "row",
                  paddingVertical: 8,
                  paddingHorizontal: 8,
                  borderBottomWidth: index < ingredients.length - 1 ? 1 : 0,
                  borderBottomColor: "#F3F4F6",
                  alignItems: "center",
                }}
              >
                {/* Selector de Materia Prima */}
                <View style={{ flex: 3, paddingRight: 8 }}>
                  <FormProSelect
                    name={`${name}.${index}.ingredient_id`}
                    model="products"
                    fetchParams={{
                      product_type: ["raw_material"],
                    }}
                    placeholder="Seleccione materia prima"
                  />
                </View>

                {/* Input de Cantidad */}
                <View style={{ flex: 1, paddingHorizontal: 4 }}>
                  <FormInput
                    name={`${name}.${index}.quantity`}
                    placeholder="0.00"
                    keyboardType="numeric"
                  />
                </View>

                {/* Input de Notas */}
                <View style={{ flex: 2, paddingHorizontal: 4 }}>
                  <FormInput
                    name={`${name}.${index}.notes`}
                    placeholder="Notas opcionales"
                  />
                </View>

                {/* Botón Eliminar */}
                {!readonly && (
                  <View style={{ width: 50, alignItems: "center" }}>
                    <TouchableOpacity
                      onPress={() => removeIngredient(ingredient.id)}
                      style={{
                        backgroundColor: "#FEE2E2",
                        padding: 8,
                        borderRadius: 4,
                      }}
                    >
                      <Ionicons name="trash" size={16} color={palette.red} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <View
          style={{
            borderWidth: 1,
            borderColor: "#E5E7EB",
            borderRadius: 8,
            padding: 24,
            alignItems: "center",
          }}
        >
          <Ionicons
            name="cube-outline"
            size={48}
            color="#9CA3AF"
            style={{ marginBottom: 8 }}
          />
          <Text
            style={{
              color: "#6B7280",
              fontSize: 14,
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            No hay ingredientes agregados
          </Text>
          <Text
            style={{
              color: "#9CA3AF",
              fontSize: 12,
              textAlign: "center",
            }}
          >
            Haga clic en "Agregar" para comenzar a añadir materias primas
          </Text>
        </View>
      )}
    </View>
  );
}
