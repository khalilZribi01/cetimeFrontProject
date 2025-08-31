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

const API_BASE = "http://localhost:4000";
const AFFECT_URL = `${API_BASE}/rendezvous/affecter/admin`;
const REASSIGN_URL = (id) => `${API_BASE}/rendezvous/${id}/reassign`;

const COLORS = {
  dispo: "#2196f3",
  valide: "#4caf50",
  attente: "#ff9800",
  annule: "#f44336"
};

export default function CalendrierAdmin() {
  const [events, setEvents] = useState([]);
  const [agents, setAgents] = useState([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null); // { startStr, endStr }
  const [selectedEvent, setSelectedEvent] = useState(null); // EventApi (RDV)
  const [mode, setMode] = useState("assign"); // "assign" | "reassign"
  const token = localStorage.getItem("token");

  const authHeader = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  // 🔑 Index toujours à jour (indépendant du cycle de rendu)
  const agentIndexRef = useRef({}); // { "10": {id:10, name:"...", email:"..."} }

  useEffect(() => {
    (async () => {
      await fetchAgents(); // met à jour agents + agentIndexRef.current
      await fetchData();   // utilise agentIndexRef.current immédiatement
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildIndex = (list) =>
    Object.fromEntries((list || []).map((a) => [String(a.id), a]));

  const fetchAgents = async () => {
    try {
      const res = await axios.get(
        `${API_BASE}/routes/users/by-group?group=employee&limit=200`,
        authHeader
      );
      const items = (res.data || [])
        .map((u) => {
          const id = u.id ?? u.value;
          const name =
            u?.partner?.name || u?.partner_name || u?.label || u?.login || `Employé #${id}`;
          const email = u?.partner?.email || u?.email || null;
          return { id, name, email };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      setAgents(items);
      agentIndexRef.current = buildIndex(items); // ✅ prêt pour fetchData()
      return items;
    } catch (e) {
      console.error("Erreur chargement agents:", e);
      setAgents([]);
      agentIndexRef.current = {};
      return [];
    }
  };

  const fetchData = async () => {
    try {
      const idx = agentIndexRef.current; // ✅ index fiable

      // Disponibilités (bleu)
      const dispoRes = await axios.get(`${API_BASE}/disponibilite/all`, authHeader);
      const disponibilites = (dispoRes.data || []).map((item) => {
        const nameFromIndex = idx[String(item.agentId)]?.name;
        const title = nameFromIndex || item.agentName || `Agent ${item.agentId}`;
        return {
          title,
          start: item.start,
          end: item.end,
          backgroundColor: COLORS.dispo,
          borderColor: COLORS.dispo,
          extendedProps: { kind: "dispo" }
        };
      });

      // RDV (vert/orange/rouge)
      const rdvRes = await axios.get(`${API_BASE}/rendezvous/admin`, authHeader);
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

        const agentName =
          rdv?.agent?.partner?.name ||
          rdv?.agentName ||
          idx[String(rdv?.agentId)]?.name ||
          (rdv?.agentId ? `Agent ${rdv.agentId}` : "À affecter");

        const clientName = rdv?.client?.partner?.name || rdv?.clientName || "Client";

        return {
          id: rdv.id,
          title: rdv.title || `RDV: ${clientName} / ${agentName}`,
          start,
          end,
          backgroundColor: color,
          borderColor: color,
          extendedProps: {
            kind: "rdv",
            statut: rdv.statut,
            agentId: rdv.agentId ?? null,
            agentName,
            clientName
          }
        };
      });

      setEvents([...disponibilites, ...rdvs]);
    } catch (err) {
      console.error("Erreur de chargement admin :", err);
    }
  };

  // Créneau vide → affecter une dispo
  const handleDateSelect = (selectInfo) => {
    setMode("assign");
    setSelectedSlot({ startStr: selectInfo.startStr, endStr: selectInfo.endStr });
    setSelectedEvent(null);
    setSelectedAgentId("");
    setAssignOpen(true);
  };

  // Clic RDV → réaffectation
  const handleEventClick = (clickInfo) => {
    const kind = clickInfo?.event?.extendedProps?.kind;
    if (kind !== "rdv") return;
    setMode("reassign");
    setSelectedEvent(clickInfo.event);
    const currentAgentId = clickInfo.event.extendedProps?.agentId;
    setSelectedAgentId(currentAgentId ? String(currentAgentId) : "");
    setSelectedSlot(null);
    setAssignOpen(true);
  };

  // Confirmer (assign OU reassign)
  const confirmAssign = async () => {
    if (!selectedAgentId) return;

    try {
      if (mode === "reassign" && selectedEvent) {
        await axios.put(REASSIGN_URL(selectedEvent.id), { agentId: selectedAgentId }, authHeader);
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

      {/* Dialog assign / reassign */}
      <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          {mode === "reassign" ? "Réaffecter un agent à ce RDV" : "Affecter un agent au créneau sélectionné"}
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
                {new Date(selectedEvent.start).toLocaleString()} → {new Date(selectedEvent.end).toLocaleString()}
              </Typography>
            </Box>
          )}

          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel id="agent-select-label">Agent</InputLabel>
            <Select
              labelId="agent-select-label"
              label="Agent"
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              renderValue={(value) => agentIndexRef.current[String(value)]?.name || ""}
              MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
            >
              {agents.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  <Box display="flex" flexDirection="column">
                    <Typography>{a.name}</Typography>
                    {a.email && (
                      <Typography variant="caption" color="text.secondary">
                        {a.email}
                      </Typography>
                    )}
                  </Box>
                </MenuItem>
              ))}
              {agents.length === 0 && <MenuItem disabled>Aucun agent disponible</MenuItem>}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={confirmAssign} disabled={!selectedAgentId}>
            {mode === "reassign" ? "Réaffecter" : "Affecter"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
