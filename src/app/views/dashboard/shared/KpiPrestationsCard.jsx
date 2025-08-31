// components/shared/KpiPrestationsCard.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Box, Card, Stack, Typography, LinearProgress, Grid, Chip, Divider
} from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";
import FolderIcon from "@mui/icons-material/Folder";
import AcUnitIcon from "@mui/icons-material/AcUnit";
import DoughnutChart from "./Doughnut";

const API_BASE = "http://localhost:4000";

/** Etats techniques -> libellés FR */
const TECH_TO_FR = {
  closed: "Clôturé",
  done: "Réalisée",
  draft: "Demande",
  open: "Affectée",
  rejected: "Rejeté",
};

/** Les 3 catégories KPI à afficher */
const KPI_BUCKETS = [
  { key: "Réalisée", label: "Achevés" },
  { key: "Affectée", label: "En cours de traitement" },
  { key: "Demande",  label: "Attente confirmation" },
];

const CardRoot = styled(Card)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: 16,
  background: `linear-gradient(180deg, ${theme.palette.primary.light}20 0%, ${theme.palette.primary.light}10 100%)`,
  boxShadow: theme.shadows[1],
}));

const IconTile = styled(Box)(({ theme }) => ({
  width: 56,
  height: 56,
  borderRadius: 12,
  background: theme.palette.background.paper,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: theme.shadows[1],
}));

function pct(n, d) {
  const num = Number(n || 0);
  const den = Number(d || 0);
  if (!den) return "0%";
  return Math.round((num * 100) / den) + "%";
}

function Row({ label, value, percent, bold = false }) {
  return (
    <Stack direction="row" spacing={2} alignItems="baseline">
      <Typography sx={{ minWidth: 170 }} fontWeight={bold ? 700 : 500}>
        {label}
      </Typography>
      <Typography sx={{ minWidth: 64 }} fontWeight={bold ? 700 : 600}>
        {value?.toLocaleString?.() ?? value}
      </Typography>
      {percent != null && (
        <Typography color="text.secondary" sx={{ ml: 1 }}>
          {percent}
        </Typography>
      )}
    </Stack>
  );
}

export default function KpiPrestationsCard() {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [apiTotal, setApiTotal] = useState(0);     // total global (tous états)
  const [countsFR, setCountsFR] = useState({});    // ex: { Réalisée: 225, Affectée: 19653, Demande: 3950, ... }

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      try {
        const r = await fetch(`${API_BASE}/dossier/prestations/summary`);
        const j = await r.json();
        const map = {};
        (j.counts || []).forEach(({ state, count }) => {
          const fr = TECH_TO_FR[String(state).toLowerCase()];
          if (fr) map[fr] = Number(count || 0);
        });
        if (alive) {
          setApiTotal(Number(j.total || 0));
          setCountsFR(map);
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, []);

  // total affiché = somme des 3 états KPI
  const displayedTotal = useMemo(
    () => KPI_BUCKETS.reduce((acc, b) => acc + Number(countsFR[b.key] || 0), 0),
    [countsFR]
  );

  // Données donut (somme = displayedTotal)
  const donutData = useMemo(
    () =>
      KPI_BUCKETS.map(({ key, label }) => ({
        name: label,
        value: countsFR[key] || 0,
      })),
    [countsFR]
  );

  return (
    <CardRoot>
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Grid container spacing={2} alignItems="stretch">
        {/* GAUCHE : icône + chiffres */}
        <Grid item xs={12} md={7}>
          <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ height: "100%" }}>
            <IconTile>
              <FolderIcon color="primary" fontSize="large" />
            </IconTile>

            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: .5 }}>
                Nombre Total
              </Typography>

              {/* Total affiché = somme des 3 états KPI */}
              <Row label="Total" value={displayedTotal} bold />

              {/* Rappel du total global si différent */}
              {apiTotal > 0 && apiTotal !== displayedTotal && (
                <Typography variant="caption" color="text.secondary">
                  Total global (tous états) : {apiTotal.toLocaleString()}
                </Typography>
              )}

              <Divider sx={{ my: 1, borderColor: "transparent" }} />

              {KPI_BUCKETS.map(({ key, label }) => (
                <Row
                  key={key}
                  label={`${label} :`}
                  value={countsFR[key] || 0}
                  percent={pct(countsFR[key] || 0, displayedTotal)}
                />
              ))}

              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Chip size="small" label="30 derniers jours" />
                <Chip size="small" label="Prestations" color="primary" variant="outlined" />
              </Stack>
            </Box>
          </Stack>
        </Grid>

        {/* DROITE : donut parfaitement centré */}
        <Grid item xs={12} md={5}>
          <Stack
            direction="column"
            spacing={2}
            justifyContent="center"
            alignItems="center"
            sx={{ height: "100%" }}
          >
            {/* Icône optionnelle au-dessus du donut */}
            <IconTile>
              <AcUnitIcon color="info" fontSize="large" />
            </IconTile>

            <Box sx={{ width: 260, maxWidth: "100%" }}>
              <DoughnutChart
                height={240}
                data={donutData}
                colors={[
                  theme.palette.success.main,
                  theme.palette.info.main,
                  theme.palette.warning.main,
                ]}
                showCenterTotal
              />
            </Box>
          </Stack>
        </Grid>
      </Grid>
    </CardRoot>
  );
}
