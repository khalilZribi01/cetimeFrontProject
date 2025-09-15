import { useEffect, useMemo, useState } from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
import DOMPurify from "dompurify";
import {
  Box, Breadcrumbs, Chip, CircularProgress, Divider, Grid, Link, Paper,
  Stack, Typography, Card, CardContent, IconButton, Tooltip, Collapse, Button
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import DescriptionIcon from "@mui/icons-material/Description";
import FolderIcon from "@mui/icons-material/Folder";
import PlaceIcon from "@mui/icons-material/Place";
import CategoryIcon from "@mui/icons-material/Category";
import ApartmentIcon from "@mui/icons-material/Apartment";
import BadgeIcon from "@mui/icons-material/Badge";

const API_BASE = "http://localhost:4000";

const STATE_META = {
  closed:   { label: "Clôturé",  color: "default" },
  done:     { label: "Réalisée", color: "success" },
  open:     { label: "Affectée", color: "info" },
  draft:    { label: "Demande",  color: "warning" },
  rejected: { label: "Rejeté",   color: "error" },
};

function Field({ label, value, icon = null }) {
  const isEmpty = value == null || String(value).trim() === "";
  return (
    <Stack spacing={0.5} sx={{ p: 1.2 }}>
      <Stack direction="row" alignItems="center" spacing={0.75}>
        {icon}
        <Typography variant="caption" color="text.secondary">{label}</Typography>
      </Stack>
      <Typography variant="body2">{isEmpty ? "—" : value}</Typography>
    </Stack>
  );
}

const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? String(d) : dt.toLocaleString("fr-FR");
};

function resolveReadable(row = {}) {
  const readable = { ...row };
  // remplace les IDs par les libellés quand on les a
  readable.department_id       = row.department_name ?? row.department_id;
  readable.activity_id         = row.activity_name   ?? row.activity_id;
  readable.country_id          = row.country_name    ?? row.country_id;
  readable.analytic_account_id =
    (row.analytic_code || row.analytic_name)
      ? [row.analytic_code, row.analytic_name].filter(Boolean).join(" — ")
      : row.analytic_account_id;
  readable.responsible_id      = row.responsible_name  ?? row.responsible_id;
  readable.responsible1_id     = row.responsible1_name ?? row.responsible1_id;

  // libellés plus parlants sur certains champs système
  readable.alias_model        = row.alias_model === "project.task" ? "Tâche projet" : row.alias_model;
  readable.privacy_visibility = row.privacy_visibility === "employees" ? "Employés" : row.privacy_visibility;

  // dates formattées
  ["create_date","write_date","date","date_creation","last_update_team_leader"]
    .forEach(k => { if (row[k]) readable[k] = fmtDate(row[k]); });

  return readable;
}

/** 🔤 Libellés “métier” (propres) pour les champs techniques */
const TECH_LABELS = {
  id: "ID interne",
  name_primary: "Nom du projet",
  prestation: "N° de prestation",
  state: "Statut",
  reference_bordereau: "Référence bordereau",

  department_id: "Département",
  activity_id: "Activité",
  country_id: "Pays",
  analytic_account_id: "Compte analytique",

  responsible_id: "Responsable principal",
  responsible1_id: "Responsable secondaire",
  user_id: "Affecté à",

  iat: "IAT (référence)",
  iat_case: "Dossier IAT",
  iat_number: "N° IAT",

  office_order_id: "Ordre de bureau",
  sequence_tri: "Séquence de tri",
  sequence_pres: "Séquence d’affichage",

  t: "Marqué T",
  active: "Actif",
  privacy_visibility: "Visibilité",
  alias_model: "Type d’objet",

  date: "Date du document",
  date_creation: "Date de création",
  create_date: "Créé le",
  write_date: "Modifié le",
  current_user: "Utilisateur courant",
};

const HIDE_KEYS = new Set([
  // textes longs déjà affichés proprement plus haut
  "entete","desctiption","documents",
  // colonnes d’aide (déjà remappées)
  "department_name","activity_name","country_name","analytic_name","analytic_code",
  // bruit technique qu’on ne veut pas montrer
  "message_last_post","color","resource_calendar_id","subtask_project_id",
  "label_tasks","flag_create","super_user","is__sale_manager","intervenats",
]);

export default function PrestationDetails() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [showTech, setShowTech] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const r = await fetch(`${API_BASE}/dossier/${id}/full`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (mounted) setData(j);
      } catch (e) {
        if (mounted) setErr(String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  // ⚠️ TOUS LES HOOKS (useMemo) AVANT TOUT RETURN CONDITIONNEL
  const row = data?.row ?? null;
  const enteteRaw = row?.entete ?? "";
  const descRaw   = row?.desctiption ?? "";

  const enteteSafe = useMemo(
    () => ({ __html: DOMPurify.sanitize(String(enteteRaw)) }),
    [enteteRaw]
  );
  const descSafe = useMemo(
    () => ({ __html: DOMPurify.sanitize(String(descRaw)) }),
    [descRaw]
  );

  const readable = useMemo(() => resolveReadable(row || {}), [row]);
  const techEntries = useMemo(() => {
    return Object.entries(readable)
      .filter(([k,v]) => !HIDE_KEYS.has(k))
      .filter(([,v]) => !(v == null || String(v).trim() === ""))
      .sort(([a],[b]) => a.localeCompare(b));
  }, [readable]);

  // ⬇️ Retour conditionnel APRÈS les hooks
  if (loading) return <Box p={3}><CircularProgress size={28} /></Box>;
  if (err || !row) {
    return (
      <Box p={3}>
        <Typography variant="h6" color="error">Impossible de charger la prestation</Typography>
        <Typography variant="body2" color="text.secondary">{err || "Non trouvée"}</Typography>
      </Box>
    );
  }

  const r = row;
  const numero = r.prestation || r.name_primary || `#${id}`;
  const stateKey = String(r.state || "").toLowerCase();
  const stateMeta = STATE_META[stateKey] || { label: r.state || "—", color: "default" };

  const dept        = r.department_name ?? r.department_id ?? "—";
  const activity    = r.activity_name   ?? r.activity_id   ?? "—";
  const country     = r.country_name    ?? r.country_id    ?? "—";
  const analyticVal =
    (r.analytic_code || r.analytic_name)
      ? [r.analytic_code, r.analytic_name].filter(Boolean).join(" — ")
      : (r.analytic_account_id ?? "—");
  const responsable = r.responsible_name ?? r.responsible1_name ?? r.responsible_id ?? "—";

  return (
    <Box p={3}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component={RouterLink} underline="hover" color="inherit" to="/">Accueil</Link>
        <Link component={RouterLink} underline="hover" color="inherit" to="/document/prestation">Prestations</Link>
        <Typography color="text.primary">{numero}</Typography>
      </Breadcrumbs>

      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h4" fontWeight={700}>{numero}</Typography>
        <Chip label={stateMeta.label} color={stateMeta.color} size="small" />
        <Box flex={1} />
        <Typography variant="body2" color="text.secondary">ID interne : <strong>{r.id}</strong></Typography>
      </Stack>

      <Card variant="outlined" sx={{ mb: 2, borderRadius: 3 }}>
        <CardContent>
          <Grid container spacing={1}>
            <Grid item xs={12} sm={6} md={4}>
              <Field label="Nom du projet" value={r.name_primary} icon={<FolderIcon fontSize="inherit" />} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Field label="Référence bordereau" value={r.reference_bordereau} icon={<DescriptionIcon fontSize="inherit" />} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Field label="Département" value={dept} icon={<ApartmentIcon fontSize="inherit" />} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Field label="Activité" value={activity} icon={<CategoryIcon fontSize="inherit" />} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Field label="Pays" value={country} icon={<PlaceIcon fontSize="inherit" />} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Field label="Compte analytique" value={analyticVal} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Field label="Responsable" value={responsable} icon={<BadgeIcon fontSize="inherit" />} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Field label="Date du document" value={fmtDate(r.date)} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Field label="Date de création" value={fmtDate(r.create_date || r.date_creation)} />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">Entête</Typography>
              <Paper variant="outlined" sx={{ p: 2, mt: 0.5, borderRadius: 2 }}>
                {enteteRaw
                  ? <Box sx={{ "& p": { m: 0, mb: 1 } }} dangerouslySetInnerHTML={enteteSafe} />
                  : <Typography color="text.secondary">—</Typography>}
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">Description</Typography>
              <Paper variant="outlined" sx={{ p: 2, mt: 0.5, borderRadius: 2 }}>
                {descRaw
                  ? <Box sx={{ "& p": { m: 0, mb: 1 } }} dangerouslySetInnerHTML={descSafe} />
                  : <Typography color="text.secondary">—</Typography>}
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 2, borderRadius: 3 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <Typography variant="subtitle1">Documents</Typography>
          </Stack>
          {Array.isArray(data.documents) && data.documents.length > 0 ? (
            <Grid container spacing={1}>
              {data.documents.map((d) => (
                <Grid item key={d.id} xs={12} sm={6} md={4}>
                  <Paper variant="outlined" sx={{ p: 1.25, display: "flex", alignItems: "center", gap: 1, borderRadius: 2 }}>
                    <PictureAsPdfIcon fontSize="small" />
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      #{d.id} • {d.type || "Document"} • {d.date ? fmtDate(d.date) : "—"}
                    </Typography>
                    {d.cheminFichier && (
                      <Button size="small" href={d.cheminFichier} target="_blank" rel="noreferrer">
                        Ouvrir
                      </Button>
                    )}
                  </Paper>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography color="text.secondary">Aucun document.</Typography>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <Typography variant="subtitle1">Détails techniques</Typography>
            <Tooltip title={showTech ? "Masquer" : "Afficher"}>
              <IconButton onClick={() => setShowTech((s) => !s)} size="small">
                <ExpandMoreIcon sx={{ transform: showTech ? "rotate(180deg)" : "rotate(0deg)", transition: "0.2s" }} />
              </IconButton>
            </Tooltip>
          </Stack>
          <Collapse in={showTech}>
            <Divider sx={{ mb: 2 }} />
            <Grid container>
              {techEntries.map(([k, v]) => (
                <Grid key={k} item xs={12} sm={6} md={4}>
                  <Field label={TECH_LABELS[k] || k} value={String(v)} />
                </Grid>
              ))}
            </Grid>
          </Collapse>
        </CardContent>
      </Card>
    </Box>
  );
}
