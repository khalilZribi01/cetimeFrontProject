import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Snackbar,
  Alert
} from "@mui/material";
import axios from "axios";

const DepartmentForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    create_date: "",
    active: true,
    name: "",
    code: ""
  });

  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  // Charger les données du département si en édition
  useEffect(() => {
    if (id) {
      axios.get(`http://localhost:4000/departments/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      })
        .then((res) => setFormData(res.data))
        .catch((err) => console.error("Erreur chargement département:", err));
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const now = new Date().toISOString();

    try {
      const dataToSend = { ...formData, write_date: now };

      if (id) {
        await axios.put(`http://localhost:4000/departments/${id}`, dataToSend, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        });
      } else {
        await axios.post("http://localhost:4000/departments/add", dataToSend, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        });
      }

      setOpen(true);
      setFormData({
        create_date: "",
        active: true,
        name: "",
        code: ""
      });

      setTimeout(() => {
        navigate("/dashboard/default");
      }, 1500);
    } catch (err) {
      setError("Erreur lors de la soumission du formulaire.");
      console.error(err);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 600, mx: "auto", mt: 5 }}>
      <Typography variant="h6" gutterBottom>
        {id ? "Modifier le département" : "Ajouter un département"}
      </Typography>

      <form onSubmit={handleSubmit}>
        <TextField
          label="Date de création"
          name="create_date"
          type="datetime-local"
          fullWidth
          margin="normal"
          value={formData.create_date}
          onChange={handleChange}
          required
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          label="Nom"
          name="name"
          fullWidth
          margin="normal"
          value={formData.name}
          onChange={handleChange}
          required
        />
        <TextField
          label="Code"
          name="code"
          fullWidth
          margin="normal"
          value={formData.code}
          onChange={handleChange}
          required
        />

        <Box textAlign="right" mt={2}>
          <Button type="submit" variant="contained" color="primary">
            Enregistrer
          </Button>
        </Box>
      </form>

      <Snackbar open={open} autoHideDuration={3000} onClose={() => setOpen(false)}>
        <Alert onClose={() => setOpen(false)} severity="success" sx={{ width: "100%" }}>
          Département {id ? "modifié" : "créé"} avec succès !
        </Alert>
      </Snackbar>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Paper>
  );
};

export default DepartmentForm;
