// src/views/calendrier/CalendrierAdmin.jsx
import { useEffect, useState, useMemo, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from "@mui/material";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

// Endpoints (nouvelle API de validation/annulation incluse)
const USERS_ALLOWED_URL = `${API_BASE}/api/auth/allowed`;
const USERS_FALLBACK_URL = `${API_BASE}/routes/users/by-group?group=employee&limit=200`;
const DISPO_ALL_URL     = `${API_BASE}/disponibilite/all`;
const RDV_ADMIN_URL     = `${API_BASE}/rendezvous/admin`;
const AFFECT_URL        = `${API_BASE}/rendezvous/affecter/admin`;
const REASSIGN_URL      = (id) => `${API_BASE}/rendezvous/${id}/reassign`;
const CONFIRM_URL       = (id) => `${API_BASE}/rendezvous/confirmer/${id}`;
const CANCEL_URL        = (id) => `${API_BASE}/rendezvous/annuler/${id}`;

const COLORS = {
  dispo:   "#2196f3",
  valide:  "#4caf50",
  attente: "#ff9800",
  annule:  "#f44336",
};

// --- helpers ---
const tagP = (name) => {
  const s = String(name || "").trim();
  return s && s !== "À affecter" ? `${s} - P` : s;
};

const isSameDay = (d1, d2) => {
  const a = new Date(d1), b = new Date(d2);
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
};

const useHasSameDay = (events) => (kind, agentId, dayRef, ignoreId = null) =>
  events.some((e) => {
    if (e?.extendedProps?.kind !== kind) return false;
    if (String(e.extendedProps.agentId) !== String(agentId)) return false;
    if (ignoreId && String(e.id) === String(ignoreId)) return false;
    return isSameDay(e.start, dayRef);
  });

export default function CalendrierAdmin() {
  const [events, setEvents] = useState([]);
  const [agents, setAgents] = useState([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null);   // { startStr, endStr }
  const [selectedEvent, setSelectedEvent] = useState(null); // EventApi (RDV)
  const [mode, setMode] = useState("assign"); // "assign" | "reassign"

  const token = localStorage.getItem("token");
  const authHeader = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );

  const agentIndexRef = useRef({}); // id -> {id,name,email}
  const hasSameDay = useHasSameDay(events);
  const hasDispoSameDay = (agentId, dayRef) => hasSameDay("dispo", agentId, dayRef);
  const hasRdvSameDay   = (agentId, dayRef, ignoreId = null) =>
    hasSameDay("rdv", agentId, dayRef, ignoreId);

  useEffect(() => {
    (async () => {
      await fetchAgents();
      await fetchData();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildIndex = (list) =>
    Object.fromEntries((list || []).map((a) => [String(a.id), a]));

  const fetchAgents = async () => {
    try {
      // Essai 1: liste des agents autorisés (ta nouvelle route)
      let res = await axios.get(USERS_ALLOWED_URL, authHeader);
      let items = Array.isArray(res.data) ? res.data : [];
      if (items.length === 0) {
        // Fallback: ancien endpoint par groupe
        res = await axios.get(USERS_FALLBACK_URL, authHeader);
        items = (res.data || []).map((u) => ({
          id: u.id ?? u.value,
          name:
            u?.partner?.name ||
            u?.partner_name ||
            u?.label ||
            u?.login ||
            `Employé #${u.id ?? u.value}`,
          email: u?.partner?.email || u?.email || null,
        }));
      } else {
        // Normaliser les champs attendus
        items = items.map((a) => ({
          id: a.id,
          name: a.name,
          email: a.email || null,
        }));
      }

      items.sort((x, y) => String(x.name).localeCompare(String(y.name)));
      setAgents(items);
      agentIndexRef.current = buildIndex(items);
      return items;
    } catch (e) {
      console.error("Erreur chargement agents autorisés:", e);
      setAgents([]);
      agentIndexRef.current = {};
      return [];
    }
  };

  const fetchData = async () => {
    try {
      const idx = agentIndexRef.current;

      // Disponibilités (bleu)
      const dispoRes = await axios.get(DISPO_ALL_URL, authHeader);
      const disponibilites = (dispoRes.data || []).map((item) => {
        const label = idx[String(item.agentId)]?.name || item.agentName || `Agent ${item.agentId}`;
        const title = tagP(label);
        return {
          id: `dispo-${item.id ?? `${item.agentId}-${item.start}`}`,
          title,
          start: item.start,
          end: item.end,
          backgroundColor: COLORS.dispo,
          borderColor: COLORS.dispo,
          extendedProps: { kind: "dispo", agentId: item.agentId },
        };
      });

      // RDVs
      const rdvRes = await axios.get(RDV_ADMIN_URL, authHeader);
      const rdvs = (rdvRes.data || []).map((rdv) => {
        const start = rdv.start || rdv.dateRdv;
        const end =
          rdv.end ||
          (rdv.dateRdv && rdv.duree
            ? new Date(new Date(rdv.dateRdv).getTime() + rdv.duree * 60000)
            : undefined);

        let color = COLORS.attente;
        if (rdv.statut === "valide") color = COLORS.valide;
        else if (rdv.statut === "annule") color = COLORS.annule;

        const agentLabel =
          idx[String(rdv?.agentId)]?.name ||
          rdv?.agent?.partner?.name ||
          rdv?.agentName ||
          (rdv?.agentId ? `Agent ${rdv.agentId}` : "À affecter");

        const clientName = rdv?.client?.partner?.name || rdv?.clientName || "Client";

        return {
          id: rdv.id,
          title: `RDV: ${clientName} / ${tagP(agentLabel)}`,
          start,
          end,
          backgroundColor: color,
          borderColor: color,
          extendedProps: {
            kind: "rdv",
            statut: rdv.statut,        // 'en_attente' | 'valide' | 'annule'
            agentId: rdv.agentId ?? null,
            agentName: tagP(agentLabel),
            clientName,
            duree: rdv.duree,
          },
        };
      });

      setEvents([...disponibilites, ...rdvs]);
    } catch (err) {
      console.error("Erreur de chargement admin :", err);
    }
  };

  // Sélection d’un créneau vide → affecter (création d’une DISPO)
  const handleDateSelect = (selectInfo) => {
    setMode("assign");
    setSelectedSlot({ startStr: selectInfo.startStr, endStr: selectInfo.endStr });
    setSelectedEvent(null);
    setSelectedAgentId("");
    setAssignOpen(true);
  };

  // Clic sur un RDV → réaffecter (change l’AGENT du RDV) + afficher boutons Confirmer / Annuler
  const handleEventClick = (clickInfo) => {
    const kind = clickInfo?.event?.extendedProps?.kind;
    if (kind !== "rdv") return;
    setMode("reassign");
    setSelectedEvent(clickInfo.event);
    setSelectedAgentId("");
    setSelectedSlot(null);
    setAssignOpen(true);
  };

  // Agents disabled dans le Select (selon la contrainte "1 / jour")
  const disabledAgents = useMemo(() => {
    const set = new Set();
    if (mode === "assign" && selectedSlot?.startStr) {
      // on empêche de créer une DISPO si l’agent a déjà une DISPO ce jour
      agents.forEach((a) => {
        if (hasDispoSameDay(a.id, selectedSlot.startStr)) set.add(String(a.id));
      });
    } else if (mode === "reassign" && selectedEvent?.start) {
      // on empêche de réassigner vers un agent qui a déjà un RDV ce jour
      agents.forEach((a) => {
        if (hasRdvSameDay(a.id, selectedEvent.start, selectedEvent.id))
          set.add(String(a.id));
      });
      const currentId = selectedEvent?.extendedProps?.agentId;
      if (currentId) set.add(String(currentId)); // agent actuel désactivé
    }
    return set;
  }, [agents, events, mode, selectedSlot, selectedEvent, hasDispoSameDay, hasRdvSameDay]);

  // Confirmer (création dispo OU réaffectation RDV)
  const confirmAssign = async () => {
    if (!selectedAgentId) return;

    const refDate =
      mode === "reassign" ? selectedEvent?.start : selectedSlot?.startStr;

    // garde-fou local
    const violation =
      mode === "reassign"
        ? hasRdvSameDay(selectedAgentId, refDate, selectedEvent?.id)
        : hasDispoSameDay(selectedAgentId, refDate);

    if (violation) {
      alert("Cet agent est déjà pris ce jour-là.");
      return;
    }

    try {
      if (mode === "reassign" && selectedEvent) {
        await axios.put(
          REASSIGN_URL(selectedEvent.id),
          { agentId: selectedAgentId },
          authHeader
        );
      } else if (mode === "assign" && selectedSlot) {
        await axios.post(
          AFFECT_URL,
          { agentId: selectedAgentId, start: selectedSlot.startStr, end: selectedSlot.endStr },
          authHeader
        );
      }

      setAssignOpen(false);
      setSelectedSlot(null);
      setSelectedEvent(null);
      await fetchData();
    } catch (err) {
      console.error("Erreur affectation/réaffectation:", err);
    }
  };

  // === NOUVEAU : CONFIRMER/REFUSER le RDV par l’ADMIN ===
  const confirmRdvByAdmin = async () => {
    if (!selectedEvent) return;
    try {
      // L’admin peut confirmer avec l’agent choisi dans le Select (optionnel)
      const body = selectedAgentId ? { agentId: selectedAgentId } : {};
      await axios.post(CONFIRM_URL(selectedEvent.id), body, authHeader);

      setAssignOpen(false);
      setSelectedSlot(null);
      setSelectedEvent(null);
      await fetchData();
    } catch (err) {
      // 409 si conflit "agent déjà pris ce jour-là" (règle back)
      console.error("Erreur confirmation admin:", err?.response?.data || err);
      alert(err?.response?.data?.message || "Erreur lors de la confirmation");
    }
  };

  const cancelRdvByAdmin = async () => {
    if (!selectedEvent) return;
    try {
      await axios.put(CANCEL_URL(selectedEvent.id), {}, authHeader);
      setAssignOpen(false);
      setSelectedSlot(null);
      setSelectedEvent(null);
      await fetchData();
    } catch (err) {
      console.error("Erreur annulation admin:", err?.response?.data || err);
      alert(err?.response?.data?.message || "Erreur lors de l'annulation");
    }
  };

  return (
    <>
      {/* Légende */}
      <Box display="flex" gap={2} mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <Box width={12} height={12} bgcolor={COLORS.dispo} borderRadius={1} />
          <Typography>Disponibilité Agent</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <Box width={12} height={12} bgcolor={COLORS.valide} borderRadius={1} />
          <Typography>RDV Validé</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <Box width={12} height={12} bgcolor={COLORS.attente} borderRadius={1} />
          <Typography>RDV en Attente</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <Box width={12} height={12} bgcolor={COLORS.annule} borderRadius={1} />
          <Typography>RDV Annulé</Typography>
        </Box>
      </Box>

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        events={events}
        selectable
        select={handleDateSelect}
        eventClick={handleEventClick}
        height="auto"
      />

      {/* Dialog assign / reassign / confirm / cancel */}
      <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          {mode === "reassign"
            ? "Gérer ce RDV (réaffecter / confirmer / annuler)"
            : "Affecter un agent au créneau sélectionné"}
        </DialogTitle>

        <DialogContent>
          {mode === "reassign" && selectedEvent && (
            <Box mb={2}>
              <Typography variant="body2" color="text.secondary">
                {selectedEvent.extendedProps?.clientName
                  ? `RDV: ${selectedEvent.extendedProps.clientName}`
                  : selectedEvent.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {new Date(selectedEvent.start).toLocaleString()} →{" "}
                {new Date(selectedEvent.end).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Statut: {selectedEvent.extendedProps?.statut}
              </Typography>
            </Box>
          )}

          {/* Sélecteur d'agent (sert à réaffecter ET peut servir à confirmer avec un agent précis) */}
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel id="agent-select-label">Agent</InputLabel>
            <Select
              labelId="agent-select-label"
              label="Agent"
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              renderValue={(value) =>
                value ? tagP(agentIndexRef.current[String(value)]?.name || "") : "Choisir un agent"
              }
              MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
            >
              {agents.map((a) => {
                const disabled = disabledAgents.has(String(a.id));
                const isCurrent =
                  mode === "reassign" &&
                  selectedEvent?.extendedProps?.agentId &&
                  String(selectedEvent.extendedProps.agentId) === String(a.id);

                const showSameDayHint =
                  (mode === "assign" && selectedSlot?.startStr && hasDispoSameDay(a.id, selectedSlot.startStr)) ||
                  (mode === "reassign" && selectedEvent?.start && hasRdvSameDay(a.id, selectedEvent.start, selectedEvent.id));

                return (
                  <MenuItem key={a.id} value={a.id} disabled={disabled}>
                    <Box display="flex" flexDirection="column">
                      <Typography>
                        {tagP(a.name)}
                        {isCurrent ? " (actuel)" : ""}
                        {showSameDayHint ? " — déjà pris aujourd'hui" : ""}
                      </Typography>
                      {a.email && (
                        <Typography variant="caption" color="text.secondary">
                          {a.email}
                        </Typography>
                      )}
                    </Box>
                  </MenuItem>
                );
              })}
              {agents.length === 0 && (
                <MenuItem disabled>Aucun agent autorisé</MenuItem>
              )}
            </Select>
          </FormControl>
        </DialogContent>

        <DialogActions sx={{ flexWrap: "wrap", gap: 1, px: 3, pb: 2 }}>
          <Button onClick={() => setAssignOpen(false)}>Fermer</Button>

          {/* Bouton affecter / réaffecter */}
          {mode === "assign" ? (
            <Button variant="contained" onClick={confirmAssign} disabled={!selectedAgentId}>
              Affecter (créer dispo)
            </Button>
          ) : (
            <>
              <Button
                variant="outlined"
                onClick={confirmAssign}
                disabled={!selectedAgentId}
              >
                Réaffecter l’agent
              </Button>

              {/* CONFIRMER RDV (ADMIN) — dispo d'utiliser selectedAgentId */}
              {selectedEvent?.extendedProps?.statut === "en_attente" && (
                <Button
                  variant="contained"
                  color="success"
                  onClick={confirmRdvByAdmin}
                >
                  Confirmer le RDV
                </Button>
              )}

              {/* ANNULER RDV (ADMIN) */}
              {selectedEvent && selectedEvent?.extendedProps?.statut !== "annule" && (
                <Button
                  variant="contained"
                  color="error"
                  onClick={cancelRdvByAdmin}
                >
                  Annuler le RDV
                </Button>
              )}
            </>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
