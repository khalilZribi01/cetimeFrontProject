import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Chip,
  Divider,
  IconButton,
  LinearProgress,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import RefreshIcon from "@mui/icons-material/Refresh";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { DataGrid } from "@mui/x-data-grid";

const API_BASE = "http://localhost:4000";

/* ---------- états techniques (DB/backend) -> libellés FR (UI) ---------- */
const TECH_TO_FR = {
  closed: "Clôturé",
  done: "Réalisée",
  draft: "Demande",
  open: "Affectée",
  rejected: "Rejeté",
};
/* libellés FR -> états techniques (pour les requêtes) */
const FR_TO_TECH = Object.fromEntries(
  Object.entries(TECH_TO_FR).map(([tech, fr]) => [fr, tech])
);

/* ordre d’affichage + couleur */
const STATE_META = {
  Clôturé: { color: "default" },
  Réalisée: { color: "success" },
  Demande: { color: "warning" },
  Affectée: { color: "info" },
  Rejeté: { color: "error" },
};

export default function AppExpansionPanel() {
  const [counts, setCounts] = useState({});
  // { [FR]: { rows, count, loaded, page, pageSize } }
  const [byState, setByState] = useState({});
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingState, setLoadingState] = useState("");

  /* --------- colonnes du tableau (adaptées au payload fourni) --------- */
  const columns = [
    {
      field: "numero",
      headerName: "N° Prestation",
      width: 180,
      valueGetter: (p) => p?.row?.prestation || p?.row?.name_primary || "",
    },
    {
      field: "department_name",
      headerName: "Département",
      width: 200,
    },
    {
      field: "activity_name",
      headerName: "Activité",
      width: 260,
    },
    {
      field: "reference_bordereau",
      headerName: "Référence bordereau",
      flex: 1,
      minWidth: 260,
    },
    {
      field: "date",
      headerName: "Date",
      width: 120,
      valueGetter: (p) => {
        const d = p?.row?.date || p?.row?.create_date;
        return d ? String(d).slice(0, 10) : "";
      },
    },
    {
      field: "action",
      headerName: "",
      sortable: false,
      filterable: false,
      width: 64,
      renderCell: (p) =>
        p?.row ? (
          <IconButton
            size="small"
            onClick={() => window.open(`/prestations/${p.row.id}`, "_blank")}
          >
            <OpenInNewIcon fontSize="inherit" />
          </IconButton>
        ) : null,
    },
  ];

  /* --------- API --------- */

  // Compteurs par état
  async function loadCounts() {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/dossier/prestations/summary`);
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = await r.json(); // { counts:[{state,count}], total }
      const map = {};
      (j.counts || []).forEach(({ state, count }) => {
        const fr = TECH_TO_FR[String(state).toLowerCase()];
        if (fr) map[fr] = count;
      });
      setCounts(map);
    } finally {
      setLoading(false);
    }
  }

  // Lignes pour un état (pagination serveur)
  async function loadStateRows(frState, page = 1, pageSize = 10, q = "") {
    const tech = FR_TO_TECH[frState];
    if (!tech) return;

    setLoadingState(frState);

    const url = new URL(`${API_BASE}/dossier/prestations`);
    url.searchParams.set("state", tech);
    url.searchParams.set("page", page);
    url.searchParams.set("pageSize", pageSize);
    if (q) url.searchParams.set("q", q);

    try {
      const r = await fetch(url.toString());
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = await r.json(); // { rows, count, page, pageSize }

      const rows = (Array.isArray(j.rows) ? j.rows : []).map((r = {}) => ({
        id: r.id,
        // champs utilisés par le DataGrid
        prestation: r.prestation ?? null,
        name_primary: r.name_primary ?? "",
        department_name: r.department_name ?? "",
        activity_name: r.activity_name ?? "",
        reference_bordereau: r.reference_bordereau ?? "",
        date: r.date ?? r.create_date ?? null,
        // état FR (utile si besoin)
        state: frState,
        // conserver tout l’objet d’origine
        ...r,
      }));

      setByState((prev) => ({
        ...prev,
        [frState]: {
          rows,
          count: Number(j.count ?? rows.length),
          loaded: true,
          page: Number(j.page ?? page),
          pageSize: Number(j.pageSize ?? pageSize),
        },
      }));
    } finally {
      setLoadingState("");
    }
  }

  useEffect(() => {
    loadCounts();
  }, []);

  const onRefresh = async () => {
    setByState({});
    await loadCounts();
  };

  return (
    <Box p={3}>
      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        <Typography variant="h6">Prestations</Typography>
        <Box flex={1} />
        <TextField
          size="small"
          placeholder="Rechercher…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // Enter relance le chargement pour les panneaux ouverts
            if (e.key === "Enter") {
              Object.keys(byState).forEach((frState) => {
                const b = byState[frState];
                if (b?.loaded) loadStateRows(frState, 1, b.pageSize ?? 10, e.currentTarget.value);
              });
            }
          }}
        />
        <IconButton onClick={onRefresh} title="Rafraîchir">
          <RefreshIcon />
        </IconButton>
      </Stack>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {Object.entries(STATE_META).map(([frState, meta]) => {
        const bucket = byState[frState];
        const count = counts[frState] ?? 0;

        return (
          <Accordion
            key={frState}
            onChange={(_, expanded) => {
              if (expanded && !bucket?.loaded) {
                // 1er dépliage -> charge la page 1 (10 lignes)
                loadStateRows(frState, 1, 10, query);
              }
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Chip size="small" label={frState} color={meta.color} />
                <Typography variant="body2" color="text.secondary">
                  {count}
                </Typography>
                {loadingState === frState && <LinearProgress sx={{ width: 80, ml: 1 }} />}
              </Stack>
            </AccordionSummary>

            <AccordionDetails>
              {!bucket?.loaded ? (
                <Typography color="text.secondary">Ouvrez pour charger…</Typography>
              ) : bucket.rows.length === 0 ? (
                <Typography color="text.secondary">Aucune prestation.</Typography>
              ) : (
                <Box sx={{ height: Math.min(72 * Math.min(bucket.rows.length, 8) + 110, 560) }}>
                  <DataGrid
                    rows={bucket.rows}
                    columns={columns}
                    getRowId={(r) => r?.id ?? `${frState}-${r?.prestation ?? ""}-${r?.date ?? ""}`}
                    disableRowSelectionOnClick
                    paginationMode="server"
                    rowCount={bucket.count}
                    paginationModel={{
                      pageSize: bucket.pageSize ?? 10,
                      page: (bucket.page ?? 1) - 1, // 0-based pour MUI
                    }}
                    pageSizeOptions={[5, 10, 25, 50]}
                    onPaginationModelChange={({ page, pageSize }) => {
                      loadStateRows(frState, page + 1, pageSize, query);
                    }}
                  />
                </Box>
              )}
            </AccordionDetails>
            <Divider />
          </Accordion>
        );
      })}
    </Box>
  );
}
