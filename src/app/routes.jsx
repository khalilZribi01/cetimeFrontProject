import { lazy } from "react";
import { Navigate } from "react-router-dom";

import AuthGuard from "./auth/AuthGuard";
import { authRoles } from "./auth/authRoles";

import Loadable from "./components/Loadable";
import MatxLayout from "./components/MatxLayout/MatxLayout";
import sessionRoutes from "./views/sessions/session-routes";
import materialRoutes from "app/views/material-kit/MaterialRoutes";
import CalendrierAgent from "./views/material-kit/checkbox/CalendrierAgent";

// Pages
const Analytics = Loadable(lazy(() => import("app/views/dashboard/Analytics")));
const UserProfile = Loadable(lazy(() => import("app/views/UserProfile/UserProfile")));
const AppButton = Loadable(lazy(() => import("app/views/material-kit/buttons/AppButton")));
const AppEchart = Loadable(lazy(() => import("app/views/charts/echarts/AppEchart")));
const AppAutoComplete = Loadable(
  lazy(() => import("app/views/material-kit/auto-complete/AppAutoComplete"))
);
const EditDocumentPage = Loadable(
  lazy(() => import("app/views/material-kit/auto-complete/EditDocumentPage"))
);

const routes = [
  {
    path: "/",
    element: <Navigate to="dashboard/default" />
  },

  {
    element: (
      <AuthGuard>
        <MatxLayout />
      </AuthGuard>
    ),
    children: [
      ...materialRoutes,
      { path: "/dashboard/default", element: <Analytics />, auth: authRoles.guest },
      { path: "/user-profile/:id", element: <UserProfile />, auth: authRoles.user },

      // ✅ Accès protégé uniquement pour ADMIN
      { path: "/departement/departement", element: <AppButton />, auth: authRoles.admin },
      { path: "/document/addDocuement", element: <AppAutoComplete /> },
      { path: "/document/editDocuement/:id", element: <EditDocumentPage /> },
    { path: "/calendrier", element: <CalendrierAgent />, auth: authRoles.employee },


      // ✅ Accès protégé uniquement pour ADMIN
      { path: "/departement/departement/:id", element: <AppButton />, auth: authRoles.admin },
      { path: "/charts/echarts", element: <AppEchart />, auth: authRoles.editor }
    ]
  },

  ...sessionRoutes
];

export default routes;
