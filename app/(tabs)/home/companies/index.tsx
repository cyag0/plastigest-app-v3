import ActiveBadge from "@/components/App/ActiveBadge";
import AppList from "@/components/App/AppList/AppList";
import { AppListColumn } from "@/components/App/AppList/AppListDataTable";
import PermissionGate from "@/components/App/PermissionGate";
import { AppModalRef } from "@/components/Feedback/Modal/AppModal";
import FilterModal from "@/components/Feedback/Modal/FilterModal";
import palette from "@/constants/palette";
import { generateCrudMenu } from "@/utils/routes";
import Services from "@/utils/services";
import { formatPhone } from "@/utils/phone";
import { Href, useRouter } from "expo-router";
import * as React from "react";
import { StyleSheet } from "react-native";
import { Avatar } from "react-native-paper";

interface CompanyIndexScreenProps {
  route?: Href;
}

export default function CompaniesIndexScreen(props: CompanyIndexScreenProps) {
  const navigation = useRouter();
  const modalRef = React.useRef<AppModalRef>(null);

  const route: Href = props.route || "/(tabs)/home/companies";

  const columns: AppListColumn<any>[] = [
    { title: "Nombre", dataIndex: "name", key: "name", width: 200 },
    { title: "Razón Social", dataIndex: "business_name", key: "business_name", width: 220 },
    { title: "Email", dataIndex: "email", key: "email", width: 200 },
    { title: "Teléfono", dataIndex: "phone", key: "phone", width: 140, render: (value) => formatPhone(value) },
    {
      title: "Estado",
      key: "is_active",
      width: 100,
      align: "center",
      render: (_, item) => <ActiveBadge active={!!item.is_active} feminine />,
    },
  ];

  return (
    <PermissionGate permission="companies_list">
      <AppList
        title="Compañías"
        service={Services.admin.companies}
        permissionPrefix="companies"
        columns={columns}
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
          right: <ActiveBadge active={!!item.is_active} feminine />,
          bottom: [
            ...(item.email ? [{ label: "Email", value: item.email }] : []),
            ...(item.phone ? [{ label: "Tel", value: formatPhone(item.phone) }] : []),
          ],
        })}
        searchPlaceholder="Buscar compañías..."
        menu={generateCrudMenu(route)}
      />

      <FilterModal ref={modalRef} />
    </PermissionGate>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: palette.primary,
  },
});
