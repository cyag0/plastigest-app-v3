import { FormCheckBox } from "@/components/Form/AppCheckBox";
import { FormDatePicker } from "@/components/Form/AppDatePicker";
import AppForm, { FormRef } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormRadioButton } from "@/components/Form/AppRadioButton";
import { FormSelectSimple } from "@/components/Form/AppSelect/AppSelect";
import { FormTimePicker } from "@/components/Form/AppTimePicker";
import { useRef } from "react";
import * as Yup from "yup";

export default function TestScreen() {
  const formRef = useRef<FormRef>(null);

  return (
    <AppForm
      readonly={true}
      validationSchema={Yup.object().shape({
        name: Yup.string()
          .required("El nombre es requerido")
          .min(3, "El nombre debe tener al menos 3 caracteres"),
        is_person: Yup.boolean().required("Debe seleccionar una opción"),
      })}
      initialValues={{ name: "", is_person: false }}
      ref={formRef}
    >
      <FormInput name="name" label={"Nombre"} />
      <FormCheckBox name="is_person" label="¿Es una persona?" />
      <FormDatePicker name="date" label="Selecciona una fecha" />
      <FormTimePicker name="time" label="Selecciona una hora" />
      <FormRadioButton
        required
        name="gender"
        label="Género"
        options={[
          { label: "Masculino", value: "male" },
          { label: "Femenino", value: "female" },
          { label: "Otro", value: "other" },
        ]}
      />
      <FormSelectSimple
        multiple
        data={[
          { label: "Opción 1", value: "option1" },
          { label: "Opción 2", value: "option2" },
          { label: "Opción 3", value: "option3" },
        ]}
        name="select"
        label="Selecciona una opción"
      />
      {/*    <Divider>Hola</Divider>
      <AppCheckBox name="is_person" label="¿Es una persona?" />

      <AppRadioButton
        name="gender"
        label="Género"
        options={[
          { label: "Masculino", value: "male" },
          { label: "Femenino", value: "female" },
          { label: "Otro", value: "other" },
        ]}
      />

      <AppTimePicker name="time" label="Selecciona una hora" />
      <AppDatePicker name="date" label="Selecciona una fecha" /> */}
    </AppForm>
  );
}
