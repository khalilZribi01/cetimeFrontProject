import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Table from "@mui/material/Table";
import TableRow from "@mui/material/TableRow";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import IconButton from "@mui/material/IconButton";
import { styled } from "@mui/material/styles";

import { useEffect, useState } from "react";
import axios from "axios";

import useAuth from "app/hooks/useAuth";
import VisibilityIcon from "@mui/icons-material/Visibility";
const CardHeader = styled(Box)(() => ({
  display: "flex",
  padding: "16px",
  alignItems: "center",
  justifyContent: "space-between"
}));

const Title = styled("span")(() => ({
  fontSize: "1rem",
  fontWeight: "500",
  textTransform: "capitalize"
}));

const DocumentTableStyled = styled(Table)(() => ({
  minWidth: 800,
  "& td": { borderBottom: "none" },
  "& td:first-of-type": { paddingLeft: "16px !important" }
}));

export default function DocumentTableClient() {
  const [documents, setDocuments] = useState([]); // ✅ nécessaire pour affichage
  const [error403, setError403] = useState(false);
  const { role, user } = useAuth();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (role === "CLIENT" && user?.login) {
      axios
        .get(`http://localhost:4000/dossier/byClient`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        .then((res) => {
          setDocuments(res.data);
        })
        .catch((err) => {
          console.error("Erreur dossiers client:", err);
          if (err.response?.status === 403) {
            setError403(true);
          }
        });
    }
  }, [role, user]);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0];
  };

  return (
    <Card elevation={3} sx={{ pt: "20px", mb: 3 }}>
      <CardHeader>
        <Title>Mes Dossiers ({documents.length})</Title>
      </CardHeader>

      <Box overflow="auto">
        {error403 ? (
          <Box p={2} color="error.main" textAlign="center">
            ⛔ Vous n'avez pas l'autorisation d'accéder à ces données (403).
          </Box>
        ) : (
          <DocumentTableStyled>
            <TableHead>
              <TableRow>
                <TableCell>Projet</TableCell>
                <TableCell>Département</TableCell>
                <TableCell>État</TableCell>
                <TableCell>Début Prévu</TableCell>
                <TableCell>Clôture</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Aucun dossier trouvé.
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>{doc.nom_projet}</TableCell>
                    <TableCell>{doc.departement}</TableCell>
                    <TableCell>{doc.etat}</TableCell>
                    <TableCell>
                      {formatDate(doc.date_debut_prevue || doc.dateDebutPrevue)}
                    </TableCell>
                    <TableCell>{formatDate(doc.date_cloture || doc.dateCloture)}</TableCell>
                    <TableCell>
              
                      {doc?.documents?.length > 0 ? (
                        <IconButton
                          onClick={() =>
                            window.open(
                              `http://localhost:4000/${doc.documents[0].cheminFichier.replace(
                                "\\",
                                "/"
                              )}`,
                              "_blank"
                            )
                          }
                        >
                          <VisibilityIcon />
                        </IconButton>
                      ) : (
                        <IconButton disabled>
                          <VisibilityIcon color="disabled" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </DocumentTableStyled>
        )}
      </Box>
    </Card>
  );
}
