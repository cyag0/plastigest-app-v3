import { useLocalSearchParams } from "expo-router";
import React from "react";
import CashRegisterFormScreen from "../form";

export default function EditCashRegister() {
  const { id } = useLocalSearchParams();
  return <CashRegisterFormScreen id={Number(id)} />;
}
