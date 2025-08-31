import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  TableContainer,
  Avatar,
  IconButton,
  Chip,
  LinearProgress,
  Tooltip,
  Typography,
} from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";
import EditIcon from "@mui/icons-material/Edit";
import RefreshIcon from "@mui/icons-material/Refresh";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Header = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 20px 8px",
}));

const Title = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  fontSize: "1.05rem",
}));

const NiceTable = styled(Table)(({ theme }) => ({
  minWidth: 760,
  "& thead th": {
    fontWeight: 700,
    background: theme.palette.action.hover,
  },
  "& tbody tr:hover": {
    background: theme.palette.action.hover,
  },
  "& tbody tr:nth-of-type(odd)": {
    background: theme.palette.action.selected,
  },
  "& td, & th": {
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
}));

export default function TopSellingTable() {
  const { palette } = useTheme();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:4000/api/auth/summary", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setUsers(res.data?.users || []);
    } catch (err) {
      console.error(err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const paged = useMemo(() => {
    const start = page * rowsPerPage;
    return users.slice(start, start + rowsPerPage);
  }, [users, page, rowsPerPage]);

  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  return (
    <Card elevation={3} sx={{ mb: 3 }}>
      <Header>
        <Title>Liste des Utilisateurs</Title>
        <Tooltip title="Rafraîchir">
          <IconButton onClick={fetchUsers}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Header>

      {loading && <LinearProgress sx={{ mx: 2, mb: 1 }} />}

      <TableContainer sx={{ maxHeight: 480 }}>
        <NiceTable stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell width="42%">Login</TableCell>
              <TableCell width="38%">Email</TableCell>
              <TableCell width="12%" align="center">
                Statut
              </TableCell>
              <TableCell width="8%" align="center">
                Action
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {!loading && paged.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>Aucun utilisateur.</TableCell>
              </TableRow>
            )}

            {paged.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell sx={{ maxWidth: 320 }}>
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Avatar sx={{ width: 32, height: 32 }}>
                      {user.login?.[0]?.toUpperCase() || "U"}
                    </Avatar>
                    <Typography
                      noWrap
                      sx={{ overflow: "hidden", textOverflow: "ellipsis" }}
                      title={user.login}
                    >
                      {user.login}
                    </Typography>
                  </Box>
                </TableCell>

                <TableCell sx={{ maxWidth: 360 }} title={user.partner?.email}>
                  <Typography noWrap sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                    {user.partner?.email ?? "Non défini"}
                  </Typography>
                </TableCell>

                <TableCell align="center">
                  <Chip
                    size="small"
                    label={user.active ? "Activé" : "Désactivé"}
                    sx={{
                      color: "#fff",
                      bgcolor: user.active ? palette.success.main : palette.error.main,
                      fontWeight: 600,
                      minWidth: 92,
                    }}
                  />
                </TableCell>

                <TableCell align="center">
                  <Tooltip title="Éditer">
                    <IconButton onClick={() => navigate(`/user-profile/${user.id}`)}>
                      <EditIcon color="primary" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </NiceTable>
      </TableContainer>

      <TablePagination
        component="div"
        rowsPerPageOptions={[5, 10, 25, 50]}
        count={users.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="Lignes par page"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
        sx={{ px: 2 }}
      />
    </Card>
  );
}
