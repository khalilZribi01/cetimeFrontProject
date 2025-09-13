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
  annule: "#f44336",
};

// --- helpers ---
const isSameDay = (d1, d2) => {
  const a = new Date(d1), b = new Date(d2);
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
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
  const authHeader = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );

  const agentIndexRef = useRef({}); // id -> {id,name,email}

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
      agentIndexRef.current = buildIndex(items);
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
      const idx = agentIndexRef.current;

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
          extendedProps: { kind: "dispo", agentId: item.agentId },
        };
      });

      // RDVs : ⚠️ nécessite que l’API renvoie bien agentId (cf. backend ci-dessous)
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
            agentId: rdv.agentId ?? null, // 👈 utilisé pour désactiver l’agent le même jour
            agentName,
            clientName,
          },
        };
      });

      setEvents([...disponibilites, ...rdvs]);
    } catch (err) {
      console.error("Erreur de chargement admin :", err);
    }
  };

  // --- règle métier: 1 RDV max / agent / jour ---
  const hasRdvSameDay = (agentId, dayRef, ignoreRdvId = null) =>
    events.some((e) => {
      if (e?.extendedProps?.kind !== "rdv") return false;
      if (String(e.extendedProps.agentId) !== String(agentId)) return false;
      if (ignoreRdvId && String(e.id) === String(ignoreRdvId)) return false;
      return isSameDay(e.start, dayRef);
    });

  // Agents disabled dans le Select (selon le jour choisi)
  const disabledAgents = useMemo(() => {
    const set = new Set();
    if (mode === "assign" && selectedSlot?.startStr) {
      const refDate = selectedSlot.startStr;
      agents.forEach((a) => {
        if (hasRdvSameDay(a.id, refDate, null)) set.add(String(a.id));
      });
    } else if (mode === "reassign" && selectedEvent?.start) {
      const refDate = selectedEvent.start;
      const currentId = selectedEvent.extendedProps?.agentId;
      agents.forEach((a) => {
        if (hasRdvSameDay(a.id, refDate, selectedEvent.id)) set.add(String(a.id));
      });
      if (currentId) set.add(String(currentId)); // l'agent actuel reste affiché mais disabled
    }
    return set;
  }, [agents, events, mode, selectedSlot, selectedEvent]);

  // Sélection d’un créneau vide → affecter
  const handleDateSelect = (selectInfo) => {
    setMode("assign");
    setSelectedSlot({ startStr: selectInfo.startStr, endStr: selectInfo.endStr });
    setSelectedEvent(null);
    setSelectedAgentId("");
    setAssignOpen(true);
  };

  // Clic sur un RDV → réaffecter
  const handleEventClick = (clickInfo) => {
    const kind = clickInfo?.event?.extendedProps?.kind;
    if (kind !== "rdv") return;
    setMode("reassign");
    setSelectedEvent(clickInfo.event);
    setSelectedAgentId("");
    setSelectedSlot(null);
    setAssignOpen(true);
  };

  // Confirmer
  const confirmAssign = async () => {
    if (!selectedAgentId) return;

    const refDate =
      mode === "reassign" ? selectedEvent?.start : selectedSlot?.startStr;

    // garde-fou: 1 RDV max / jour
    if (hasRdvSameDay(selectedAgentId, refDate, mode === "reassign" ? selectedEvent?.id : null)) {
      alert("Cet agent a déjà un RDV ce jour-là.");
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
          {
            agentId: selectedAgentId,
            start: selectedSlot.startStr,
            end: selectedSlot.endStr,
          },
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
          {mode === "reassign"
            ? "Réaffecter un agent à ce RDV"
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
            </Box>
          )}

          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel id="agent-select-label">Agent</InputLabel>
            <Select
              labelId="agent-select-label"
              label="Agent"
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              renderValue={(value) =>
                value ? agentIndexRef.current[String(value)]?.name || "" : "Choisir un agent"
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
                  (mode === "assign" && selectedSlot?.startStr && hasRdvSameDay(a.id, selectedSlot.startStr)) ||
                  (mode === "reassign" && selectedEvent?.start && hasRdvSameDay(a.id, selectedEvent.start, selectedEvent.id));

                return (
                  <MenuItem key={a.id} value={a.id} disabled={disabled}>
                    <Box display="flex" flexDirection="column">
                      <Typography>
                        {a.name}
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
