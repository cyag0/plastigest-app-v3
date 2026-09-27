import { useLocalSearchParams } from "expo-router";
import React from "react";
import CashRegisterFormScreen from "../form";

export default function ShowCashRegister() {
  const { id } = useLocalSearchParams();
  return <CashRegisterFormScreen id={Number(id)} readonly />;
}
