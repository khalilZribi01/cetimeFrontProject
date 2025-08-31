import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Table from "@mui/material/Table";
import TableRow from "@mui/material/TableRow";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import IconButton from "@mui/material/IconButton";
import { styled } from "@mui/material/styles";
import Edit from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

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

export default function DocumentTable() {
  const [documents, setDocuments] = useState([]);
  const [clientsMap, setClientsMap] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchDocuments();

    axios
      .get("http://localhost:4000/api/auth/clients")
      .then((res) => {
        const map = {};
        res.data.forEach((client) => {
          map[client.id] = client.login;
        });
        setClientsMap(map);
      })
      .catch((err) => console.error(err));
  }, []);

  const fetchDocuments = () => {
    axios
      .get("http://localhost:4000/dossier/all")
      .then((res) => setDocuments(res.data))
      .catch((err) => console.error(err));
  };

  const getClientName = (client) => {
    if (!client) return "";
    if (isNaN(client)) return client;
    return clientsMap[client] || client;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0];
  };

  const handleDelete = (id) => {
    const confirmDelete = window.confirm("Voulez-vous vraiment supprimer ce dossier ?");
    if (!confirmDelete) return;

    axios
      .delete(`http://localhost:4000/dossier/dossier/${id}`)
      .then(() => {
        setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      })
      .catch((err) => {
        console.error("Erreur lors de la suppression :", err);
        alert("Échec de la suppression !");
      });
  };

  return (
    <Card elevation={3} sx={{ pt: "20px", mb: 3 }}>
      <CardHeader>
        <Title>Liste des Dossiers</Title>
      </CardHeader>

      <Box overflow="auto">
        <DocumentTableStyled>
          <TableHead>
            <TableRow>
              <TableCell>Projet</TableCell>
              <TableCell>Client</TableCell>
              <TableCell>Département</TableCell>
              <TableCell>État</TableCell>
              <TableCell>Début Prévu</TableCell>
              <TableCell>Clôture</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {documents.map((doc) => {
              
              return (
                <TableRow key={doc.id}>
                  <TableCell>{doc.nom_projet}</TableCell>
                  <TableCell>{getClientName(doc.client)}</TableCell>
                  <TableCell>{doc.departement}</TableCell>
                  <TableCell>{doc.etat}</TableCell>
                  <TableCell>{formatDate(doc.date_debut_prevue || doc.dateDebutPrevue)}</TableCell>
                  <TableCell>{formatDate(doc.date_cloture || doc.dateCloture)}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => navigate(`/document/editDocuement/${doc.id}`)}>
                      <Edit color="primary" />
                    </IconButton>

                    <IconButton color="error" onClick={() => handleDelete(doc.id)}>
                      <DeleteIcon />
                    </IconButton>
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
              );
            })}
          </TableBody>
        </DocumentTableStyled>
      </Box>
    </Card>
  );
}
