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
  Typography,
  Button
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import RefreshIcon from "@mui/icons-material/Refresh";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { DataGrid } from "@mui/x-data-grid";
import { PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer } from "recharts";

const API_BASE = "http://localhost:4000";

/* ---------- états techniques (DB/backend) -> libellés FR (UI) ---------- */
const TECH_TO_FR = {
  closed: "Clôturé",
  done: "Réalisée",
  draft: "Demande",
  open: "Affectée",
  rejected: "Rejeté"
};
/* libellés FR -> états techniques */
const FR_TO_TECH = Object.fromEntries(Object.entries(TECH_TO_FR).map(([tech, fr]) => [fr, tech]));

/* ordre + couleurs */
const STATE_ORDER = ["Clôturé", "Réalisée", "Demande", "Affectée", "Rejeté"];
const STATE_COLORS = {
  Clôturé: "#9e9e9e",
  Réalisée: "#2e7d32",
  Demande: "#ed6c02",
  Affectée: "#0288d1",
  Rejeté: "#d32f2f"
};

export default function AppExpansionPanel() {
  const [counts, setCounts] = useState({});
  // { [FR]: { rows, count, loaded, page, pageSize } }
  const [byState, setByState] = useState({});
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingState, setLoadingState] = useState("");
  const [selectedState, setSelectedState] = useState(null); // tranche cliquée du donut

  // ✅ controlled accordions
  const [expanded, setExpanded] = useState({}); // { "Affectée": true, ... }

  useEffect(() => {
    if (selectedState) {
      setExpanded({ [selectedState]: true }); // n’ouvrir que celle sélectionnée
    } else {
      setExpanded({}); // aucune ouverte par défaut
    }
  }, [selectedState]);

  /* --------- colonnes du tableau --------- */
  const columns = [
    { field: "numero", headerName: "N° Prestation", width: 220 },
    { field: "department_name", headerName: "Département", width: 200 },
    { field: "activity_name", headerName: "Activité", width: 260 },
    { field: "reference_bordereau", headerName: "Référence bordereau", flex: 1, minWidth: 260 },
      { field: "date_str", headerName: "Date", width: 120 },

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
            title="Ouvrir"
          >
            <OpenInNewIcon fontSize="inherit" />
          </IconButton>
        ) : null
    }
  ];

  /* --------- API --------- */
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
      // ...dans loadStateRows(...)
      const rows = (Array.isArray(j.rows) ? j.rows : []).map((r = {}) => {
        const rawDate = r.date ?? r.date_creation ?? r.create_date ?? r.date_start ?? null;

        const date_str = rawDate
          ? new Date(rawDate).toLocaleDateString("fr-FR") // "27/04/2025"
          : "";

        return {
          id: r.id,
          prestation: r.prestation ?? null,
          name_primary: r.name_primary ?? "",
          department_name: r.department_name ?? "",
          activity_name: r.activity_name ?? "",
          reference_bordereau: r.reference_bordereau ?? "",
          // ✅ nouveau champ pour l'affichage
          date_str,
          // (on garde aussi la brute si besoin ailleurs)
          date_raw: rawDate ?? null,
          numero: r.numero ?? r.prestation ?? r.name_primary ?? "",
          state: frState,
          ...r
        };
      });

      setByState((prev) => ({
        ...prev,
        [frState]: {
          rows,
          count: Number(j.count ?? rows.length),
          loaded: true,
          page: Number(j.page ?? page),
          pageSize: Number(j.pageSize ?? pageSize)
        }
      }));
    } finally {
      setLoadingState("");
    }
  }

  useEffect(() => {
    loadCounts();
  }, []);

  // sur sélection du donut, charger si besoin
  useEffect(() => {
    if (selectedState && !byState[selectedState]?.loaded) {
      loadStateRows(selectedState, 1, 10, query);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedState]);

  const onRefresh = async () => {
    setByState({});
    setSelectedState(null);
    await loadCounts();
  };

  // Données du donut
  const pieData = STATE_ORDER.map((name) => ({
    name,
    value: counts[name] ?? 0,
    color: STATE_COLORS[name]
  })).filter((d) => d.value > 0);

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

      {/* ===== Donut + légende ===== */}
      <CardLike>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ p: 2 }}>
          <Box sx={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  dataKey="value"
                  data={pieData}
                  innerRadius={70}
                  outerRadius={95}
                  paddingAngle={1}
                  onClick={(_, idx) => {
                    const fr = pieData[idx]?.name;
                    if (fr) setSelectedState(fr);
                  }}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} cursor="pointer" />
                  ))}
                </Pie>
                <ReTooltip
                  formatter={(val, nm) => [`${val}`, nm]}
                  labelFormatter={(lbl) => `Statut: ${String(lbl)}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </Box>

          {/* Légende + actions */}
          <Stack spacing={1} sx={{ minWidth: 220 }}>
            <Typography variant="subtitle2">Statuts</Typography>
            {STATE_ORDER.map((s) => (
              <Stack
                key={s}
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={1}
              >
                <Chip
                  size="small"
                  label={s}
                  sx={{ bgcolor: STATE_COLORS[s], color: "#fff", fontWeight: 600 }}
                  onClick={() => setSelectedState(s)}
                />
                <Typography variant="body2" color="text.secondary">
                  {counts[s] ?? 0}
                </Typography>
              </Stack>
            ))}
            <Button
              startIcon={<RestartAltIcon />}
              size="small"
              onClick={() => setSelectedState(null)}
              sx={{ mt: 1, alignSelf: "flex-start" }}
            >
              Tout afficher
            </Button>
          </Stack>
        </Stack>
      </CardLike>

      {/* ===== Listes par statut ===== */}
      {(selectedState ? [selectedState] : STATE_ORDER).map((frState) => {
        const bucket = byState[frState];
        const count = counts[frState] ?? 0;
        const isExpanded = selectedState ? frState === selectedState : !!expanded[frState];

        return (
          <Accordion
            key={frState}
            expanded={isExpanded}
            onChange={(_, isOpen) => {
              setExpanded((prev) => ({ ...prev, [frState]: isOpen }));
              if (isOpen && !bucket?.loaded) {
                loadStateRows(frState, 1, 10, query);
              }
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Chip
                  size="small"
                  label={frState}
                  sx={{ bgcolor: STATE_COLORS[frState], color: "#fff" }}
                />
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
                      page: (bucket.page ?? 1) - 1 // 0-based
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

/** Petit wrapper visuel (optionnel) */
function CardLike({ children }) {
  return (
    <Box
      sx={{
        border: (t) => `1px solid ${t.palette.divider}`,
        borderRadius: 2,
        overflow: "hidden",
        mb: 2,
        bgcolor: "background.paper"
      }}
    >
      {children}
    </Box>
  );
}
