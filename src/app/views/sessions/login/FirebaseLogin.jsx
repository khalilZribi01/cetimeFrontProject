import { NavLink, useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import { Formik } from "formik";
import * as Yup from "yup";
import axios from "axios"; // 👈 important

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid2";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import TextField from "@mui/material/TextField";
import { styled, useTheme } from "@mui/material/styles";
import LoadingButton from "@mui/lab/LoadingButton";

import MatxDivider from "app/components/MatxDivider";
import { Paragraph, Span } from "app/components/Typography";
import useAuth from "app/hooks/useAuth";

import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";

// STYLED COMPONENTS
const Logo = styled("div")({
  gap: 10,
  display: "flex",
  alignItems: "center",
  "& span": { fontSize: 26, lineHeight: 1.3, fontWeight: 800 }
});

const FirebaseRoot = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#1A2038",
  minHeight: "100vh !important",
  "& .card": { maxWidth: 800, margin: "1rem" },
  "& .cardLeft": {
    color: "#fff",
    height: "100%",
    display: "flex",
    padding: "32px 56px",
    flexDirection: "column",
    backgroundSize: "cover",
    background: "#161c37 url(/assets/images/bg-3.png) no-repeat",
    [theme.breakpoints.down("sm")]: { minWidth: 200 },
    "& img": { width: 32, height: 32 }
  },
  "& .mainTitle": {
    fontSize: 18,
    lineHeight: 1.3,
    marginBottom: 24
  },
  "& .item": {
    position: "relative",
    marginBottom: 12,
    paddingLeft: 16,
    "&::after": {
      top: 8,
      left: 0,
      width: 4,
      height: 4,
      content: '""',
      borderRadius: 4,
      position: "absolute",
      backgroundColor: theme.palette.error.main
    }
  }
}));

const initialValues = {
  loginOrEmail: "",
  password: "",
  remember: true
};

const validationSchema = Yup.object().shape({
  loginOrEmail: Yup.string().required("Identifiant ou Email requis"),
  password: Yup.string().min(6, "Mot de passe minimum 6 caractères").required("Mot de passe requis")
});

export default function FirebaseLogin() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { signInWithEmail } = useAuth();

  const redirectByRole = (role) => {
    switch (role) {
      case "admin":
      case "agent":
      case "client":
        navigate("/");
        break;
      default:
        navigate("/");
    }
  };

  const handleFormSubmit = async (values, { setSubmitting }) => {
    try {
      const role = await signInWithEmail(values.loginOrEmail, values.password);
      enqueueSnackbar("Connexion réussie", { variant: "success" });
      redirectByRole(role);
    } catch (error) {
      console.error("❌ Erreur login:", error);
      enqueueSnackbar(error?.response?.data?.message || "Erreur lors de la connexion", {
        variant: "error"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ Google Login handler
  const handleGoogleLogin = async (credentialResponse) => {
    try {
      const credential = credentialResponse.credential;

      if (!credential) throw new Error("Token Google manquant");

      const decoded = jwtDecode(credential);
      console.log("✅ Données Google décodées :", decoded);

      const res = await axios.post("http://localhost:4000/api/auth/google", { credential });

      const { token, role, user } = res.data;
      localStorage.setItem("token", token);
      localStorage.setItem("role", role.toUpperCase());
      localStorage.setItem("user", JSON.stringify(user));

      navigate("/");
    } catch (err) {
      console.error("Erreur Google Login :", err);
      enqueueSnackbar("Erreur lors de la connexion avec Google", { variant: "error" });
    }
  };

  return (
    <FirebaseRoot>
      <Card className="card">
        <Grid container>
          <Grid size={{ md: 6, xs: 12 }}>
            <div className="cardLeft">
              <Logo>
                <Logo>
                  <img
                    src="../../../../../public/assets/images/logo.png"
                    alt="Logo CETIME"
                    style={{ width: 100, height: 100 }}
                  />
                </Logo>
              </Logo>
              <h1 className="mainTitle">
                Centre Technique des industries Mécaniques et Electriques (CETIME)
              </h1>
              <div className="features">
                <div className="item">+216 70 146 023</div>
                <div className="item">+216 95 486 286</div>
                <div className="item">+216 70 146 071</div>
              </div>
              
            </div>
          </Grid>

          <Grid size={{ md: 6, xs: 12 }}>
            <Box px={4} pt={4}>
              {/* ✅ Bouton Google Login */}
              <GoogleLogin
                onSuccess={handleGoogleLogin}
                onError={() =>
                  enqueueSnackbar("Erreur lors de la connexion avec Google", { variant: "error" })
                }
              />
            </Box>

            <MatxDivider sx={{ mt: 3, px: 4 }} text="Ou" />

            <Box p={4}>
              <Formik
                onSubmit={handleFormSubmit}
                initialValues={initialValues}
                validationSchema={validationSchema}
              >
                {({
                  values,
                  errors,
                  touched,
                  isSubmitting,
                  handleChange,
                  handleBlur,
                  handleSubmit
                }) => (
                  <form onSubmit={handleSubmit}>
                    <TextField
                      fullWidth
                      size="small"
                      type="text"
                      name="loginOrEmail"
                      label="Email ou Nom d'utilisateur"
                      variant="outlined"
                      onBlur={handleBlur}
                      value={values.loginOrEmail}
                      onChange={handleChange}
                      helperText={touched.loginOrEmail && errors.loginOrEmail}
                      error={Boolean(errors.loginOrEmail && touched.loginOrEmail)}
                      sx={{ mb: 3 }}
                    />

                    <TextField
                      fullWidth
                      size="small"
                      name="password"
                      type="password"
                      label="Mot de passe"
                      variant="outlined"
                      onBlur={handleBlur}
                      value={values.password}
                      onChange={handleChange}
                      helperText={touched.password && errors.password}
                      error={Boolean(errors.password && touched.password)}
                      sx={{ mb: 1.5 }}
                    />

                    <Box display="flex" justifyContent="space-between">
                      <Box display="flex" alignItems="center" gap={1}>
                        <Checkbox
                          size="small"
                          name="remember"
                          onChange={handleChange}
                          checked={values.remember}
                          sx={{ padding: 0 }}
                        />
                        <Paragraph>Se souvenir de moi</Paragraph>
                      </Box>

                      <NavLink
                        to="/session/forgot-password"
                        style={{ color: theme.palette.primary.main }}
                      >
                        Mot de passe oublié ?
                      </NavLink>
                    </Box>

                    <LoadingButton
                      type="submit"
                      color="primary"
                      loading={isSubmitting}
                      variant="contained"
                      sx={{ my: 2 }}
                    >
                      Connexion
                    </LoadingButton>

                    <Paragraph>
                      Pas encore de compte ?
                      <NavLink
                        to="/session/signup"
                        style={{ marginInlineStart: 5, color: theme.palette.primary.main }}
                      >
                        S'inscrire
                      </NavLink>
                    </Paragraph>
                  </form>
                )}
              </Formik>
            </Box>
          </Grid>
        </Grid>
      </Card>
    </FirebaseRoot>
  );
}
