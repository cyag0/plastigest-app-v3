import AppForm from "@/components/Form/AppForm/AppForm";
import AppInput from "@/components/Form/AppInput";
import palette from "@/constants/palette";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Avatar, Card, Text, TouchableRipple } from "react-native-paper";
import { SalesProvider, useSales } from "./salesContext";

export default function SalesForm() {
  return (
    <SalesProvider>
      <App />
    </SalesProvider>
  );
}

function App() {
  return (
    <AppForm
      showButtons={false}
      style={{ backgroundColor: palette.background }}
    >
      <View style={{ flex: 1, flexDirection: "row", gap: 16 }}>
        <View style={{ flex: 1 }}>
          <SelectCategories />
        </View>
        <View style={{ width: 300, flexBasis: 400 }}>
          <SideCart />
        </View>
      </View>
    </AppForm>
  );
}

function SelectCategories() {
  const [selectedCategories, setSelectedCategories] = React.useState<number[]>(
    []
  );
  const { categories } = useSales();

  return (
    <View>
      <View style={styles.titleContainer}>
        <View style={{ flex: 1 }}>
          <Text variant="titleLarge" style={{ fontWeight: "bold" }}>
            Selecciona la Categoría
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <AppInput />
        </View>
      </View>
      <ScrollView
        horizontal
        contentContainerStyle={{ gap: 12, marginVertical: 16 }}
      >
        {categories.map((category) => (
          <TouchableRipple
            onPress={() => {
              if (selectedCategories.includes(category.id)) {
                setSelectedCategories(
                  selectedCategories.filter((value) => value !== category.id)
                );
              } else {
                setSelectedCategories([...selectedCategories, category.id]);
              }
            }}
          >
            <Card
              style={{
                backgroundColor: "#fff",
                borderWidth: 0,
                outlineWidth: 0,
                elevation: 0,
                width: 100,
                height: 100,
              }}
              elevation={0}
            >
              <Card.Content style={{ alignItems: "center", gap: 8 }}>
                <Avatar.Image
                  source={{
                    uri: "https://plastigest.com.mx/storage/categories/",
                  }}
                  style={{
                    borderRadius: 8,
                    width: 40,
                    backgroundColor: "#f0f0f0",
                    height: 40,
                  }}
                />
                <Text
                  style={{
                    textAlign: "center",
                  }}
                >
                  {category.name}
                </Text>
              </Card.Content>
            </Card>
          </TouchableRipple>
        ))}
      </ScrollView>
    </View>
  );
}

function SideCart() {
  return (
    <View>
      <Text>Carrito</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});
