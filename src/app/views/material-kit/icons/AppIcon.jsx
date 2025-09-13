// src/components/DashboardKPI.jsx
import { useEffect, useMemo, useState } from "react";
import { fetchDashboard } from "../../../../__api__/kpiClient.js";
import {
  Box, Grid, Card, CardContent, Typography, Divider, Stack,
  LinearProgress, Alert, Chip
} from "@mui/material";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import EventNoteRoundedIcon from "@mui/icons-material/EventNoteRounded";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip,
  BarChart, Bar, CartesianGrid, XAxis, YAxis,
} from "recharts";

/* ---------- helpers UI ---------- */
const CardShell = ({ children, ...props }) => (
  <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }} {...props}>
    <CardContent sx={{ p: 2.25 }}>{children}</CardContent>
  </Card>
);

const KPIBox = ({ label, value, unit }) => (
  <Box>
    <Typography variant="overline" color="text.secondary">{label}</Typography>
    <Typography variant="h4" fontWeight={800}>
      {Number.isFinite(value) ? value : "—"}
      {unit && (
        <Typography component="span" variant="subtitle2" color="text.secondary" sx={{ ml: .5 }}>
          {unit}
        </Typography>
      )}
    </Typography>
  </Box>
);

/* Couleurs pour les camemberts */
const COLORS_DISPO = ["#2e7d32", "#e0e0e0"]; // Opérationnel, Arrêt
const COLORS_OCCUP = ["#0288d1", "#cfd8dc"]; // Occupé (accent), Libre

/* Petite grille lisible pour la planification */
function PlanningTable({ rows = [] }) {
  if (!rows.length) {
    return (
      <Box sx={{
        height: 110, border: "1px dashed", borderColor: "divider", borderRadius: 1.25,
        display: "grid", placeItems: "center", color: "text.disabled"
      }}>
        <Typography variant="caption">Aucune entrée récente — (clients / modèles / type d’essai)</Typography>
      </Box>
    );
  }
  return (
    <Box sx={{
      border: "1px dashed", borderColor: "divider", borderRadius: 1.25, overflow: "hidden"
    }}>
      <Box sx={{
        display: "grid", gridTemplateColumns: "2fr 2.2fr 0.8fr 1.4fr", gap: 0,
        bgcolor: "rgba(255,153,0,0.08)", px: 1.25, py: 0.75, fontWeight: 700, fontSize: 12
      }}>
        <span>Client</span>
        <span>Marque / Modèle</span>
        <span>Kg</span>
        <span>Type d’essai</span>
      </Box>
      {rows.slice(0, 12).map((r, i) => (
        <Box key={i} sx={{
          display: "grid", gridTemplateColumns: "2fr 2.2fr 0.8fr 1.4fr", px: 1.25, py: 0.6,
          borderTop: "1px solid", borderColor: "divider", fontSize: 13
        }}>
          <Typography noWrap title={r.client || ""}>{r.client || "—"}</Typography>
          <Typography noWrap title={r.marqueModele || ""}>{r.marqueModele || "—"}</Typography>
          <Typography>{(r.kg ?? "") !== "" && r.kg != null ? `${Number(r.kg)}` : "—"}</Typography>
          <Typography noWrap title={r.typeEssai || ""}>{r.typeEssai || "—"}</Typography>
        </Box>
      ))}
    </Box>
  );
}

export default function DashboardKPI() {
  const [kpi, setKpi] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboard()
      .then(r => setKpi(r.data))
      .catch(e => setError(e?.response?.data?.error || e.message));
  }, []);

  /* Données graphiques */
  const dispoData = useMemo(() => (kpi ? [
    { name: "Opérationnel", value: Math.max(0, Math.min(100, Number(kpi.tauxDisponibilitePct) || 0)) },
    { name: "Arrêt", value: Math.max(0, 100 - (Number(kpi.tauxDisponibilitePct) || 0)) },
  ] : []), [kpi]);

  // Occupation KPI = part libre => on affiche "Occupé" = 100 - KPI pour coller à la maquette.
  const occupData = useMemo(() => (kpi ? [
    { name: "Occupé", value: Math.max(0, 100 - (Number(kpi.tauxOccupationPct) || 0)) },
    { name: "Libre",  value: Math.max(0, Math.min(100, Number(kpi.tauxOccupationPct) || 0)) },
  ] : []), [kpi]);

  const barData = useMemo(() => (kpi ? [
    { name: "Traitement", value: Number(kpi.dureeMoyTraitementJ) || 0 },
    { name: "Exécution essai", value: Number(kpi.dureeMoyRealisationJ) || 0 },
  ] : []), [kpi]);

  if (error) return <Box sx={{ p: 3 }}><Alert severity="error">{error}</Alert></Box>;
  if (!kpi) return <Box sx={{ p: 3 }}><LinearProgress /></Box>;

  const planningRows = kpi.planning || [];

  return (
    <Box sx={{ maxWidth: 1440, mx: "auto", p: { xs: 1.5, md: 3 } }}>
      <Grid container spacing={2.25}>
        {/* === BANDEAU HAUT === */}
        <Grid item xs={12} md={5}>
          <CardShell>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.25 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: "50%", bgcolor: "primary.light", color: "primary.main", display: "grid", placeItems: "center" }}>
                <AssessmentRoundedIcon />
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Réception & En cours (2025)</Typography>
                <Typography variant="h6" fontWeight={800}>Synthèse</Typography>
              </Box>
              <Box sx={{ flex: 1 }} />
              <Chip size="small" label={`${kpi.nombreTotal?.demandes ?? 0} demandes / ${kpi.nombreTotal?.echantillons ?? 0} échant.`} />
            </Stack>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <KPIBox label="ACHÉVÉS" value={kpi.acheves?.demandes ?? 0} unit="demandes" />
                <Typography variant="body2" color="text.secondary">{kpi.acheves?.echantillons ?? 0} échantillons</Typography>
              </Grid>
              <Grid item xs={6}>
                <KPIBox label="EN COURS" value={kpi.enCours?.demandes ?? 0} unit="demandes" />
                <Typography variant="body2" color="text.secondary">{kpi.enCours?.echantillons ?? 0} échantillons</Typography>
              </Grid>
              <Grid item xs={12}><Divider /></Grid>
              <Grid item xs={12}>
                <Typography variant="body2">
                  <b>{kpi.achevesAggregat}</b> rendus • <b>{kpi.enCoursAggregat}</b> en cours • <b>{kpi.attenteConfirmation}</b> en attente de confirmation
                </Typography>
              </Grid>
            </Grid>
          </CardShell>
        </Grid>

        {/* Durées */}
        <Grid item xs={12} md={3}>
          <CardShell>
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1 }}>
              <Box sx={{ width: 32, height: 32, borderRadius: "50%", bgcolor: "primary.light", color: "primary.main", display: "grid", placeItems: "center" }}>
                <AccessTimeRoundedIcon />
              </Box>
              <Typography variant="subtitle2">Durée moyenne de traitement de dossier</Typography>
            </Stack>
            <Typography variant="h3" fontWeight={800}>{Number(kpi.dureeMoyTraitementJ) || 0}</Typography>
            <Typography variant="body2" color="text.secondary">jours</Typography>
          </CardShell>
        </Grid>

        <Grid item xs={12} md={4}>
          <CardShell>
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1 }}>
              <Box sx={{ width: 32, height: 32, borderRadius: "50%", bgcolor: "primary.light", color: "primary.main", display: "grid", placeItems: "center" }}>
                <AccessTimeRoundedIcon />
              </Box>
              <Typography variant="subtitle2">Durée moyenne d’exécution des essais</Typography>
            </Stack>
            <Box sx={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} barCategoryGap={30}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardShell>
        </Grid>

        {/* Planif + Respect des délais */}
        <Grid item xs={12}>
          <CardShell>
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1 }}>
              <Box sx={{ width: 32, height: 32, borderRadius: "50%", bgcolor: "primary.light", color: "primary.main", display: "grid", placeItems: "center" }}>
                <EventNoteRoundedIcon />
              </Box>
              <Typography variant="subtitle2">Planification sur 2 semaines</Typography>
            </Stack>

            <PlanningTable rows={planningRows} />

            <Box sx={{ bgcolor: "#E8F5E9", p: 1, borderRadius: 1, mt: 1.25 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "#2e7d32" }}>
                Respect des délais = {kpi.respectDelaisPct ?? 0}%
              </Typography>
            </Box>
          </CardShell>
        </Grid>

        {/* === STOCK & ESPACE === */}
        <Grid item xs={12} md={6}>
          <CardShell>
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: .5 }}>
              <Box sx={{ width: 32, height: 32, borderRadius: "50%", bgcolor: "primary.light", color: "primary.main", display: "grid", placeItems: "center" }}>
                <Inventory2RoundedIcon />
              </Box>
              <Typography variant="subtitle2">Réception / En attente d’essai</Typography>
            </Stack>
            <Typography variant="h5" fontWeight={800} sx={{ mb: .5 }}>
              {kpi.reception?.appareils ?? 0} <Typography component="span" variant="subtitle2" color="text.secondary">appareils</Typography>
            </Typography>
            <Typography variant="body2"><b>{kpi.reception?.espaceOccupeM2 ?? 0}</b> m²</Typography>
          </CardShell>
        </Grid>

        <Grid item xs={12} md={6}>
          <CardShell>
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: .5 }}>
              <Box sx={{ width: 32, height: 32, borderRadius: "50%", bgcolor: "primary.light", color: "primary.main", display: "grid", placeItems: "center" }}>
                <LocalShippingRoundedIcon />
              </Box>
              <Typography variant="subtitle2">Stockage / Retour client</Typography>
            </Stack>
            <Typography variant="h5" fontWeight={800} sx={{ mb: .5 }}>
              {kpi.stockageRetour?.appareils ?? 0} <Typography component="span" variant="subtitle2" color="text.secondary">appareils</Typography>
            </Typography>
            <Typography variant="body2"><b>{kpi.stockageRetour?.espaceOccupeM2 ?? 0}</b> m²</Typography>
          </CardShell>
        </Grid>

        {/* === BAS : Performance des moyens d’essai === */}
        <Grid item xs={12} md={4}>
          <CardShell>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: .5 }}>
              Taux de disponibilité des moyens d’essai
            </Typography>
            <Box sx={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dispoData} dataKey="value" nameKey="name" outerRadius={90} label>
                    {dispoData.map((_, i) => <Cell key={i} fill={COLORS_DISPO[i % COLORS_DISPO.length]} />)}
                  </Pie>
                  <Legend /><Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </CardShell>
        </Grid>

        <Grid item xs={12} md={4}>
          <CardShell>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: .5 }}>
              MTBF / MTTR & Arrêts (2025)
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}><KPIBox label="MTBF" value={kpi.mtbfJours} unit="jours" /></Grid>
              <Grid item xs={6}><KPIBox label="MTTR" value={kpi.mttrJours} unit="jours" /></Grid>
              <Grid item xs={6}><KPIBox label="Arrêt programmé" value={kpi.arretProgrammeJours} unit="jours" /></Grid>
              <Grid item xs={6}><KPIBox label="Arrêt non programmé" value={kpi.arretNonProgrammeJours} unit="jours" /></Grid>
            </Grid>
            {kpi.nbPannes === 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Aucune panne enregistrée — MTBF/MTTR non applicables.
              </Typography>
            )}
          </CardShell>
        </Grid>

        <Grid item xs={12} md={4}>
          <CardShell>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: .5 }}>
              Taux d’occupation des moyens d’essai
            </Typography>
            <Box sx={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={occupData} dataKey="value" nameKey="name" outerRadius={90} label>
                    {occupData.map((_, i) => <Cell key={i} fill={COLORS_OCCUP[i % COLORS_OCCUP.length]} />)}
                  </Pie>
                  <Legend /><Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </CardShell>
        </Grid>
      </Grid>
    </Box>
  );
}
