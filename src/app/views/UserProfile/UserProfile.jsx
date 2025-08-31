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
  MenuItem
} from "@mui/material";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

export default function UserProfile() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState(""); // Pour sélectionner "Actif" ou "Inactif"

  // 🔁 Charger les données utilisateur
  useEffect(() => {
    axios
      .get(`http://localhost:4000/api/auth/user/${id}`)
      .then((res) => {
        setUser(res.data);
        setActiveStatus(res.data.active ? "Actif" : "Inactif");
      })
      .catch((err) => console.error("Erreur API :", err))
      .finally(() => setLoading(false));
  }, [id]);

  const handleUpdate = () => {
    const newActive = activeStatus === "Actif";

    axios
      .put(`http://localhost:4000/api/auth/user/${id}`, {
        active: newActive
      })
      .then(() => {
        alert("✅ Mise à jour réussie !");
        setUser((prev) => ({ ...prev, active: newActive }));
      })
      .catch((err) => {
        console.error("Erreur lors de la mise à jour :", err);
        alert("❌ Erreur lors de la mise à jour.");
      });
  };

  if (loading) return <CircularProgress sx={{ m: 5 }} />;
  if (!user)
    return (
      <Typography color="error" sx={{ m: 5 }}>
        Erreur lors du chargement de l’utilisateur.
      </Typography>
    );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={600} mb={3}>
        Profil de l’utilisateur
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
                <TextField fullWidth label="ID (non modifiable)" value={user.id} disabled />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Nom d'utilisateur" value={user.login || ""} disabled />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Email" value={user.email || ""} disabled />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Statut actif"
                  value={activeStatus}
                  onChange={(e) => setActiveStatus(e.target.value)}
                >
                  <MenuItem value="Actif">Actif</MenuItem>
                  <MenuItem value="Inactif">Inactif</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Rôle" value={user.role || "Non défini"} disabled />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Button variant="contained" color="primary" onClick={handleUpdate}>
              Mettre à jour
            </Button>
          </Card>
        </Grid>

        {/* Carte profil */}
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              p: 3,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center"
            }}
          >
            <Avatar
              src="/assets/images/faces/marc.jpg"
              alt="profile"
              sx={{ width: 100, height: 100, mb: 2 }}
            />
            <Typography variant="h6">{user.login}</Typography>
            <Typography color="text.secondary" sx={{ mb: 1 }}>
              {user.role || "Utilisateur"}
            </Typography>

            <Chip
              label={user.active ? "Actif" : "Inactif"}
              color={user.active ? "success" : "default"}
              sx={{ mb: 2 }}
            />

            <Button variant="outlined" color="primary">
              Suivre
            </Button>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
