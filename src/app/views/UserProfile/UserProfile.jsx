// src/views/profile/UserProfile.jsx
import {
  Box,
  Card,
  Grid,
  Avatar,
  Button,
  TextField,
  Typography,
  Divider,
  CircularProgress,
  Chip,
  MenuItem,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";

// Utils
const fieldChanged = (orig, cur) => String(orig ?? "") !== String(cur ?? "");
const initialPwdState = { newPwd: "", confirmPwd: "" };

export default function UserProfile() {
  const params = useParams();
  const navigate = useNavigate();

  // User connecté stocké en local
  const storedUser = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);
  const loggedRole = (localStorage.getItem("role") || "").toUpperCase();
  const token = localStorage.getItem("token");

  // ID effectif (URL :id ou moi-même)
  const idFromUrl = params?.id;
  const effectiveId = !idFromUrl || idFromUrl === "me" ? storedUser?.id : idFromUrl;

  const isSelf = storedUser && String(storedUser.id) === String(effectiveId);
  const isAdmin = loggedRole === "ADMIN";

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form
  const [form, setForm] = useState({
    login: "",
    email: "",
    name: "",
    role: "",
    active: false,
  });
  const [activeStatus, setActiveStatus] = useState(""); // "Actif" | "Inactif"
  const [pwd, setPwd] = useState(initialPwdState);

  // Feedback
  const [snack, setSnack] = useState({ open: false, msg: "", sev: "success" });
  const [successOpen, setSuccessOpen] = useState(false);
  const [changedFields, setChangedFields] = useState([]);

  const authHeader = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );

  // Rediriger si pas connecté
  useEffect(() => {
    if (!effectiveId) {
      navigate("/session/signin", { replace: true });
    }
  }, [effectiveId, navigate]);

  // Charger l'utilisateur
  useEffect(() => {
    if (!effectiveId) return;
    setLoading(true);
    axios
      .get(`http://localhost:4000/api/auth/user/${effectiveId}`, authHeader)
      .then((res) => {
        setUser(res.data);
        setForm({
          login: res.data.login || "",
          email: res.data.email || "",
          name: res.data?.partner?.name || res.data.name || res.data.login || "",
          role: res.data.role || "Utilisateur",
          active: !!res.data.active,
        });
        setActiveStatus(res.data.active ? "Actif" : "Inactif");
      })
      .catch((err) => {
        console.error("Erreur API :", err);
        setSnack({
          open: true,
          sev: "error",
          msg: "Erreur lors du chargement de l’utilisateur.",
        });
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveId]);

  const handleField = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const validateBeforeSave = () => {
    if (pwd.newPwd || pwd.confirmPwd) {
      if (pwd.newPwd.length < 6) {
        setSnack({ open: true, sev: "warning", msg: "Le mot de passe doit contenir au moins 6 caractères." });
        return false;
      }
      if (pwd.newPwd !== pwd.confirmPwd) {
        setSnack({ open: true, sev: "warning", msg: "Les mots de passe ne correspondent pas." });
        return false;
      }
    }
    // email simple check
    if (fieldChanged(user?.email, form.email)) {
      const ok = /\S+@\S+\.\S+/.test(form.email);
      if (!ok) {
        setSnack({ open: true, sev: "warning", msg: "Email invalide." });
        return false;
      }
    }
    return true;
  };

  const handleUpdate = async () => {
    if (!user) return;
    if (!validateBeforeSave()) return;

    const payload = {};
    // Self: login/email/name/password
    if (isSelf) {
      if (fieldChanged(user?.login, form.login)) payload.login = form.login;
      if (fieldChanged(user?.email, form.email)) payload.email = form.email;
      if (fieldChanged(user?.name || user?.partner?.name, form.name)) payload.name = form.name;
      if (pwd.newPwd && pwd.newPwd === pwd.confirmPwd) payload.password = pwd.newPwd;
    }
    // Admin: active
    if (isAdmin && fieldChanged(user?.active, form.active)) {
      payload.active = !!form.active;
    }

    if (Object.keys(payload).length === 0) {
      setSnack({ open: true, sev: "info", msg: "Aucune modification à enregistrer." });
      return;
    }

    try {
      await axios.put(`http://localhost:4000/api/auth/user/${user.id}`, payload, authHeader);

      // MAJ état local
      setUser((prev) => ({ ...prev, ...payload }));
      if ("active" in payload) {
        setActiveStatus(payload.active ? "Actif" : "Inactif");
      }
      if (isSelf) {
        const nextUser = { ...user, ...payload };
        localStorage.setItem("user", JSON.stringify(nextUser));
      }

      setPwd(initialPwdState);

      // Champs modifiés pour le popup
      const fieldsMap = {
        login: "Login",
        email: "Email",
        name: "Nom complet",
        password: "Mot de passe",
        active: "Statut",
      };
      const changed = Object.keys(payload).map((k) => fieldsMap[k] || k);
      setChangedFields(changed);
      setSuccessOpen(true);

      setSnack({ open: true, sev: "success", msg: "✅ Mise à jour réussie." });
    } catch (err) {
      console.error("Erreur lors de la mise à jour :", err);
      const msg = err?.response?.data?.message || "❌ Erreur lors de la mise à jour.";
      setSnack({ open: true, sev: "error", msg });
    }
  };

  const goToMyProfile = () => {
    if (storedUser?.id) navigate(`/user-profile/${storedUser.id}`);
  };

  if (loading) return <CircularProgress sx={{ m: 5 }} />;

  if (!user)
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error" sx={{ mb: 2 }}>
          Erreur lors du chargement de l’utilisateur.
        </Typography>
        <Button variant="outlined" onClick={goToMyProfile}>
          Aller à mon profil
        </Button>
      </Box>
    );

  // Droits d’édition
  const canEditIdentity = isSelf;
  const canToggleActive = isAdmin;

  // Avatar fallback
  const avatarLabel = (form.name?.[0] || form.login?.[0] || "U").toUpperCase();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={600} mb={3}>
        Profil utilisateur
      </Typography>

      <Grid container spacing={3}>
        {/* Formulaire principal */}
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" mb={2}>
              Informations de base
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nom complet"
                  value={form.name}
                  onChange={handleField("name")}
                  disabled={!canEditIdentity}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nom d'utilisateur (login)"
                  value={form.login}
                  onChange={handleField("login")}
                  disabled={!canEditIdentity}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  value={form.email}
                  onChange={handleField("email")}
                  disabled={!canEditIdentity}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Statut actif"
                  value={activeStatus}
                  disabled={!canToggleActive}
                  onChange={(e) => {
                    setActiveStatus(e.target.value);
                    setForm((p) => ({ ...p, active: e.target.value === "Actif" }));
                  }}
                >
                  <MenuItem value="Actif">Actif</MenuItem>
                  <MenuItem value="Inactif">Inactif</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Rôle" value={form.role || "Non défini"} disabled />
              </Grid>

              {/* Sécurité */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Sécurité
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="password"
                  label="Nouveau mot de passe"
                  value={pwd.newPwd}
                  onChange={(e) => setPwd((p) => ({ ...p, newPwd: e.target.value }))}
                  disabled={!canEditIdentity}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="password"
                  label="Confirmer le mot de passe"
                  value={pwd.confirmPwd}
                  onChange={(e) => setPwd((p) => ({ ...p, confirmPwd: e.target.value }))}
                  disabled={!canEditIdentity}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Box display="flex" gap={1}>
              <Button variant="contained" color="primary" onClick={handleUpdate}>
                Enregistrer les modifications
              </Button>
              {isSelf && (
                <Button variant="outlined" onClick={goToMyProfile}>
                  Recharger
                </Button>
              )}
            </Box>
          </Card>
        </Grid>

        {/* Carte latérale */}
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              p: 3,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <Avatar sx={{ width: 100, height: 100, mb: 2, fontSize: 40 }}>
              {avatarLabel}
            </Avatar>
            <Typography variant="h6">{form.name || form.login}</Typography>
            <Typography color="text.secondary" sx={{ mb: 1 }}>
              {form.role || "Utilisateur"}
            </Typography>

            <Chip
              label={form.active ? "Actif" : "Inactif"}
              color={form.active ? "success" : "default"}
              sx={{ mb: 2 }}
            />

            {isSelf ? (
              <Button variant="outlined" color="primary" onClick={goToMyProfile}>
                Voir mon profil
              </Button>
            ) : (
              <Button variant="outlined" color="primary" disabled>
                Actions
              </Button>
            )}
          </Card>
        </Grid>
      </Grid>

      {/* Toast */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3500}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
      >
        <Alert
          variant="filled"
          severity={snack.sev}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          sx={{ width: "100%" }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>

      {/* Popup succès */}
      <Dialog open={successOpen} onClose={() => setSuccessOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Mise à jour réussie</DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ mb: 1 }}>
            Les données de l’utilisateur ont été modifiées avec succès.
          </Typography>
          {changedFields.length > 0 && (
            <>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Champs mis à jour :
              </Typography>
              <ul style={{ marginTop: 0 }}>
                {changedFields.map((f) => (
                  <li key={f}>
                    <Typography variant="body2">{f}</Typography>
                  </li>
                ))}
              </ul>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuccessOpen(false)}>OK</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
