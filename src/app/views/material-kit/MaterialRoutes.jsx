import { lazy } from "react";

import Loadable from "app/components/Loadable";


const AppMenu = Loadable(lazy(() => import("./menu/AppMenu")));
const AppIcon = Loadable(lazy(() => import("./icons/AppIcon")));
const AppProgress = Loadable(lazy(() => import("./AppProgress")));


const AppDialog = Loadable(lazy(() => import("./dialog/AppDialog")));
//const AppButton = Loadable(lazy(() => import("./buttons/AppButton")));
const AppCheckbox = Loadable(lazy(() => import("./checkbox/AppCheckbox")));

const AppAutoComplete = Loadable(lazy(() => import("./auto-complete/AppAutoComplete")));
const AppExpansionPanel = Loadable(lazy(() => import("./expansion-panel/AppExpansionPanel")));

const materialRoutes = [

 /* {
    path: "/material/buttons",
    element: <AppButton />,
    auth: authRoles.admin, // ✅ Seuls les admins y ont accès
  },*/
  { path: "/material/icons", element: <AppIcon /> },
  { path: "/material/progress", element: <AppProgress /> },
  { path: "/material/menu", element: <AppMenu /> },
  { path: "/material/checkbox", element: <AppCheckbox /> },
 { path: "/material/dialog", element: <AppDialog /> },
  { path: "/document/addDocuement", element: <AppAutoComplete /> },
  { path: "/document/prestation", element: <AppExpansionPanel /> },

];

export default materialRoutes;
