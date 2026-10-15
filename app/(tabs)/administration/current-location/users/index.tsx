import UsersListScreen from "@/components/Administration/Users/UsersListScreen";

/** Administración › Esta sucursal › Usuarios: quienes tienen acceso a la sucursal actual. */
export default function BranchUsersScreen() {
  return <UsersListScreen scope="location" />;
}
