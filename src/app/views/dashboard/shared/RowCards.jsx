import { useEffect, useState, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import Box from "@mui/material/Box";
import Fab from "@mui/material/Fab";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid2";

import IconButton from "@mui/material/IconButton";
import { styled } from "@mui/material/styles";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import DateRange from "@mui/icons-material/DateRange";
import StarOutline from "@mui/icons-material/StarOutline";
import format from "date-fns/format";
import { Span } from "app/components/Typography";

// STYLED COMPONENTS
const ProjectName = styled(Span)(({ theme }) => ({
  marginLeft: 24,
  fontWeight: "500",
  [theme.breakpoints.down("sm")]: { marginLeft: 4 }
}));

const StyledFabStar = styled(Fab)(({ theme }) => ({
  marginLeft: 0,
  boxShadow: "none",
  background: "#08ad6c !important",
  backgroundColor: "rgba(9, 182, 109, 1) !important",
  [theme.breakpoints.down("sm")]: { display: "none" }
}));

const StyledFab = styled(Fab)(({ theme }) => ({
  marginLeft: 0,
  boxShadow: "none",
  color: "white !important",
  background: `${theme.palette.error.main} !important`,
  [theme.breakpoints.down("sm")]: { display: "none" }
}));

export default function RowCards() {
  const [departments, setDepartments] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://localhost:4000/departments/all", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDepartments(res.data);
      } catch (error) {
        console.error("❌ Erreur lors de la récupération des départements :", error);
      }
    };

    fetchDepartments();
  }, []);

  const handleEdit = (id) => {
    navigate(`/departement/departement/${id}`);
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:4000/departments/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDepartments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error("Erreur suppression:", err);
    }
  };

  return departments.map((dep, index) => (
    <Fragment key={dep.id}>
      <Card sx={{ py: 1, px: 2 }} className="project-card">
        
        <Grid container alignItems="center">
          <Grid size={{ md: 5, xs: 7 }}>
            <Box display="flex" alignItems="center">
              {index % 2 === 0 ? (
                <StyledFabStar size="small">
                  <StarOutline />
                </StyledFabStar>
              ) : (
                <StyledFab size="small">
                  <DateRange />
                </StyledFab>
              )}
              <ProjectName>{dep.name}</ProjectName>
            </Box>
          </Grid>

          <Grid size={{ md: 3, xs: 4 }}>
            <Box color="text.secondary">
              {format(new Date(dep.create_date), "MM/dd/yyyy hh:mma")}
            </Box>
          </Grid>

          <Grid size={1}>
            <Box display="flex" justifyContent="flex-end" alignItems="center" sx={{ height: "100%" }}>
              <IconButton color="primary" onClick={() => handleEdit(dep.id)}>
                <EditIcon />
              </IconButton>
              <IconButton color="error" onClick={() => handleDelete(dep.id)}>
                <DeleteIcon />
              </IconButton>
            </Box>
          </Grid>
        </Grid>
      </Card>

      <Box py={1} />
    </Fragment>
  ));
}
