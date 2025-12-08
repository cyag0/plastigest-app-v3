import CartSidebar from "@/components/Views/POSV2/Components/CartSidebar";
import { useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";

export default function CarritoScreen() {
  const router = useRouter();

  return (
    <View style={{ flex: 1 }}>
      <CartSidebar
        isScreen={true}
        onFinish={() => {
          //router.replace("/(tabs)/home/purchases/index");
        }}
      />
    </View>
  );
}
