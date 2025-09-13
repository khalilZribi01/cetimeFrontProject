import { authRoles } from "app/auth/authRoles";

const navigations = [
  { name: "Dashboard", path: "/dashboard/default", icon: "dashboard" },
  { name: "User Profile", path: "/user-profile", icon: "person" },

  {
  name: "Prestations",
  icon: "folder",
  auth: authRoles.user, // ✅ visible uniquement pour AGENT
  children: [
    {
      name: "Liste des Prestations",
      path: "/document/prestation",
      icon: "list",
    },
    {
      name: "Ajouter Prestation",
      path: "/document/addDocuement",
      icon: "description",
    },
  ],
},
  { name: "calendrier", path: "/material/checkbox", icon: "event", auth: authRoles.admin },
    { name: "calendrier", path: "/calendrier", icon: "event", auth: authRoles.employee  },
  { name: "calendrier", path: "/material/dialog",  icon: "event",
    auth: authRoles.client },
         { name: "Nos Kpi", path: "/material/icons", icon: "description", },
     
  /* { label: "PAGES", type: "label" },
  {
    name: "Session/Auth",
    icon: "security",
    children: [
      { name: "Sign in", iconText: "SI", path: "/session/signin" },
      { name: "Sign up", iconText: "SU", path: "/session/signup" },
      { name: "Forgot Password", iconText: "FP", path: "/session/forgot-password" },
      { name: "Error", iconText: "404", path: "/session/404" }
    ]
  },*/

 /* { label: "Components", type: "label" },
  {
    name: "Components",
    icon: "favorite",
    badge: { value: "30+", color: "secondary" },
    children: [
      // { name: "Document", path: "/material/autocomplete", iconText: "A" },
      { name: "Checkbox", path: "/material/checkbox", iconText: "C" },
      { name: "Dialog", path: "/material/dialog", iconText: "D" },
      { name: "Expansion Panel", path: "/material/expansion-panel", iconText: "E" },
      { name: "Form", path: "/material/form", iconText: "F" },
      { name: "Icons", path: "/material/icons", iconText: "I" },
      { name: "Menu", path: "/material/menu", iconText: "M" },
      { name: "Progress", path: "/material/progress", iconText: "P" },
      { name: "Radio", path: "/material/radio", iconText: "R" },
      { name: "Switch", path: "/material/switch", iconText: "S" },
      { name: "Slider", path: "/material/slider", iconText: "S" },
      { name: "Snackbar", path: "/material/snackbar", iconText: "S" },
      { name: "Table", path: "/material/table", iconText: "T" }
    ]
  },

  {
    name: "Charts",
    icon: "trending_up",
    children: [{ name: "Echarts", path: "/charts/echarts", iconText: "E" }]
  },

  {
    name: "Documentation",
    icon: "launch",
    type: "extLink",
    path: "http://demos.ui-lib.com/matx-react-doc/"
  }*/
];

export default navigations;
