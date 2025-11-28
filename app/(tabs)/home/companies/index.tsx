import AppList from "@/components/App/AppList/AppList";
import { AppModalRef } from "@/components/Feedback/Modal/AppModal";
import FilterModal from "@/components/Feedback/Modal/FilterModal";
import palette from "@/constants/palette";
import { generateCrudMenu } from "@/utils/routes";
import Services from "@/utils/services";
import { Href, useRouter } from "expo-router";
import * as React from "react";
import { StyleSheet } from "react-native";
import { Avatar, Chip } from "react-native-paper";

interface CompanyIndexScreenProps {
  route?: Href;
}

export default function CompaniesIndexScreen(props: CompanyIndexScreenProps) {
  const navigation = useRouter();
  const modalRef = React.useRef<AppModalRef>(null);

  const route: Href = props.route || "/(tabs)/home/companies";

  return (
    <>
      <AppList
        title="Compañías"
        service={Services.admin.companies}
        // Mostrar 10 compañías por página
        renderCard={({ item }) => ({
          title: item.name,
          description: item.business_name,
          left: (
            <Avatar.Text
              size={50}
              label={item.name?.charAt(0)?.toUpperCase() || "C"}
              style={styles.avatar}
            />
          ),
          right: (
            <Chip
              style={{
                backgroundColor: item.is_active ? palette.primary : palette.red,
              }}
              textStyle={{ color: "white" }}
              compact
            >
              {item.is_active ? "Activa" : "Inactiva"}
            </Chip>
          ),
          bottom: [
            ...(item.email ? [{ label: "Email", value: item.email }] : []),
            ...(item.phone ? [{ label: "Tel", value: item.phone }] : []),
          ],
        })}
        searchPlaceholder="Buscar compañías..."
        menu={generateCrudMenu(route)}
      />

      <FilterModal ref={modalRef} />
    </>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: palette.primary,
  },
});
