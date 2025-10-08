import AppForm from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import React from "react";

interface UsersProps {
  id?: number;
  readonly?: boolean;
}

export default function UsersForm(props: UsersProps) {
  return (
    <AppForm>
      <FormInput name="name" label="Name" placeholder="Enter name" required />
      <FormInput
        name="email"
        label="Email"
        placeholder="Enter email"
        required
        keyboardType="email-address"
      />
    </AppForm>
  );
}
