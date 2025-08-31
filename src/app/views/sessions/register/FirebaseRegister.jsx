import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import { Formik } from "formik";
import * as Yup from "yup";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import TextField from "@mui/material/TextField";
import styled from "@mui/material/styles/styled";
import LoadingButton from "@mui/lab/LoadingButton";
import useTheme from "@mui/material/styles/useTheme";

import { Paragraph } from "app/components/Typography";
import useAuth from "app/hooks/useAuth";

// STYLED COMPONENTS
const ContentBox = styled("div")(({ theme }) => ({
  height: "100%",
  padding: "32px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: theme.palette.background.default
}));

const IMG = styled("img")({ width: "100%" });

const GoogleButton = styled(Button)(({ theme }) => ({
  color: "rgba(0, 0, 0, 0.87)",
  backgroundColor: "#e0e0e0",
  boxShadow: theme.shadows[1],
  marginBottom: "24px",
  "&:hover": { backgroundColor: "#d5d5d5" }
}));

const RegisterRoot = styled("div")({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#1A2038",
  minHeight: "100vh !important",
  "& .card": { maxWidth: 750, margin: 16, borderRadius: 12 }
});

// ✅ Données initiales
const initialValues = {
  username: "",
  email: "",
  password: "",
  role: "client",
  remember: true
};

// ✅ Validation
const validationSchema = Yup.object().shape({
  username: Yup.string().required("Username is required!"),
  email: Yup.string().email("Invalid Email address").required("Email is required!"),
  password: Yup.string()
    .min(6, "Password must be 6 character length")
    .required("Password is required!"),
  role: Yup.string().oneOf(["client", "Employee"]).required("Role is required!")
});

export default function JwtRegister() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);

  const { register, signInWithGoogle } = useAuth();

  const handleFormSubmit = async (values, { setSubmitting }) => {
    try {
      setLoading(true);
      await register(values.email, values.username, values.password, values.role);
      enqueueSnackbar("✅ Compte créé avec succès !", { variant: "success" });
      navigate("/session/signin");
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error.response?.data?.message || "Erreur lors de l'inscription", {
        variant: "error"
      });
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      setLoading(true);
      await signInWithGoogle(); // 👉 doit être défini dans useAuth()
      enqueueSnackbar("✅ Connecté avec Google", { variant: "success" });
      navigate("/");
    } catch (error) {
      console.error(error);
      enqueueSnackbar("Erreur Google Sign-in", { variant: "error" });
      setLoading(false);
    }
  };

  return (
    <RegisterRoot>
      <Card className="card">
        <Grid container>
          <Grid item md={6} xs={12}>
            <ContentBox>
              <IMG src="/assets/images/illustrations/posting_photo.svg" alt="Photo" />
            </ContentBox>
          </Grid>

          <Grid item md={6} xs={12}>
            <Box p={4} height="100%">
              <GoogleButton
                fullWidth
                variant="contained"
                onClick={handleGoogleRegister}
                startIcon={<img src="/assets/images/logos/google.svg" alt="google" />}
              >
                Sign in with Google
              </GoogleButton>

              <Formik
                onSubmit={handleFormSubmit}
                initialValues={initialValues}
                validationSchema={validationSchema}
              >
                {({ values, errors, touched, handleChange, handleBlur, handleSubmit }) => (
                  <form onSubmit={handleSubmit}>
                    <TextField
                      fullWidth
                      size="small"
                      type="text"
                      name="username"
                      label="Username"
                      variant="outlined"
                      onBlur={handleBlur}
                      value={values.username}
                      onChange={handleChange}
                      helperText={touched.username && errors.username}
                      error={Boolean(errors.username && touched.username)}
                      sx={{ mb: 3 }}
                    />

                    <TextField
                      select
                      fullWidth
                      size="small"
                      name="role"
                      label="Rôle"
                      variant="outlined"
                      value={values.role}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={Boolean(errors.role && touched.role)}
                      helperText={touched.role && errors.role}
                      sx={{ mb: 3 }}
                      SelectProps={{ native: true }}
                    >
                      <option value="client">Client</option>
                      <option value="Employee">Employee</option>
                    </TextField>

                    <TextField
                      fullWidth
                      size="small"
                      type="email"
                      name="email"
                      label="Email"
                      variant="outlined"
                      onBlur={handleBlur}
                      value={values.email}
                      onChange={handleChange}
                      helperText={touched.email && errors.email}
                      error={Boolean(errors.email && touched.email)}
                      sx={{ mb: 3 }}
                    />

                    <TextField
                      fullWidth
                      size="small"
                      name="password"
                      type="password"
                      label="Password"
                      variant="outlined"
                      onBlur={handleBlur}
                      value={values.password}
                      onChange={handleChange}
                      helperText={touched.password && errors.password}
                      error={Boolean(errors.password && touched.password)}
                      sx={{ mb: 1.5 }}
                    />

                    <Box display="flex" alignItems="center" gap={1}>
                      <Checkbox
                        size="small"
                        name="remember"
                        onChange={handleChange}
                        checked={values.remember}
                        sx={{ padding: 0 }}
                      />
                      <Paragraph fontSize={13}>
                        I have read and agree to the terms of service.
                      </Paragraph>
                    </Box>

                    <LoadingButton
                      type="submit"
                      color="primary"
                      loading={loading}
                      variant="contained"
                      sx={{ my: 2 }}
                    >
                      Register
                    </LoadingButton>

                    <Paragraph>
                      Already have an account?
                      <NavLink
                        to="/session/signin"
                        style={{ color: theme.palette.primary.main, marginLeft: 5 }}
                      >
                        Login
                      </NavLink>
                    </Paragraph>
                  </form>
                )}
              </Formik>
            </Box>
          </Grid>
        </Grid>
      </Card>
    </RegisterRoot>
  );
}
