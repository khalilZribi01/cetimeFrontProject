// src/views/calendrier/Calendrier.jsx
import { useEffect, useState, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Box, Typography, Modal, Button, Snackbar, Alert, Box as MuiBox } from "@mui/material";
import axios from "axios";
import useAuth from "app/hooks/useAuth";

const API = "http://localhost:4000";

const COLORS = {
  dispo: "#2196f3",
  valide: "#4caf50",
  attente: "#ff9800",
  annule: "#f44336",
};

export default function Calendrier() {
  const [events, setEvents] = useState([]);
  const [selectedRdv, setSelectedRdv] = useState(null);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });

  // role: "CLIENT" | "AGENT" | "EMPLOYEE" | "ADMIN"
  const { user, role } = useAuth();
  const token = localStorage.getItem("token");
  const upperRole = (role || "").toUpperCase();

  // Nom lisible de l'agent connecté
  const currentAgentName = useMemo(() => {
    return (
      user?.partner?.name ||
      user?.name ||
      user?.login ||
      (user?.id ? `Employé ${user.id}` : "Employé")
    );
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (upperRole === "CLIENT") fetchForClient();
    else if (upperRole === "AGENT" || upperRole === "EMPLOYEE") fetchForAgent();
    else if (upperRole === "ADMIN") fetchForAdmin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, upperRole]);

  // ===== CLIENT =====
  const fetchForClient = async () => {
    try {
      const res = await axios.get(`${API}/rendezvous/client`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const myEvents = (res.data || []).map((rdv) => {
        const end = new Date(new Date(rdv.dateRdv).getTime() + rdv.duree * 60000);
        let color = COLORS.attente;
        if (rdv.statut === "valide") color = COLORS.valide;
        else if (rdv.statut === "annule") color = COLORS.annule;

        const agentName = rdv.agent?.partner?.name || "Équipe";
        const title =
          rdv.statut === "valide"
            ? `RDV confirmé avec ${agentName}`
            : rdv.statut === "annule"
            ? `RDV annulé`
            : `RDV en attente`;

        return {
          id: rdv.id,
          title,
          start: rdv.dateRdv,
          end,
          backgroundColor: color,
          borderColor: color,
        };
      });

      setEvents(myEvents);
    } catch (err) {
      console.error("Erreur (client) :", err);
    }
  };

  // ===== EMPLOYEE/AGENT =====
  const fetchForAgent = async () => {
    try {
      // 1) Dispos de l'agent connecté uniquement
      let dispoData = [];
      try {
        // ✅ si tu as un endpoint filtré
        const byMe = await axios.get(`${API}/disponibilite/agent/${user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        dispoData = byMe.data || [];
      } catch {
        // sinon fallback: tout récupérer puis filtrer
        const all = await axios.get(`${API}/disponibilite/all`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        dispoData = (all.data || []).filter((d) => String(d.agentId) === String(user.id));
      }

      const disponibilites = dispoData.map((item) => ({
        title: currentAgentName, // ✅ affiche le nom de l'utilisateur
        start: item.start,
        end: item.end,
        backgroundColor: COLORS.dispo,
        borderColor: COLORS.dispo,
      }));

      // 2) RDV à valider (normalement déjà filtré côté back pour l'agent)
      const [pendingRes, valideRes] = await Promise.all([
        axios.get(`${API}/rendezvous/pending-validation`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API}/rendezvous/agent/${user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const pendingRDVs = (pendingRes.data || []).map((rdv) => ({
        id: rdv.id,
        title: `RDV à valider – ${rdv.client?.partner?.name || "Client"}`,
        start: rdv.dateRdv,
        end: new Date(new Date(rdv.dateRdv).getTime() + rdv.duree * 60000),
        backgroundColor: COLORS.attente,
        borderColor: COLORS.attente,
      }));

      const validRDVs = (valideRes.data || [])
        .filter((rdv) => rdv.statut === "valide")
        .map((rdv) => ({
          id: rdv.id,
          title: `RDV confirmé: ${rdv.client?.partner?.name || "Client"}`,
          start: rdv.dateRdv,
          end: new Date(new Date(rdv.dateRdv).getTime() + rdv.duree * 60000),
          backgroundColor: COLORS.valide,
          borderColor: COLORS.valide,
        }));

      setEvents([...disponibilites, ...pendingRDVs, ...validRDVs]);
    } catch (err) {
      console.error("Erreur (agent) :", err);
    }
  };

  // ===== ADMIN ===== (si tu gardes un calendrier admin dans ce composant)
  const fetchForAdmin = async () => {
    try {
      const res = await axios.get(`${API}/rendezvous/admin`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEvents(
        (res.data || []).map((e) => ({
          ...e,
          backgroundColor:
            e.statut === "valide" ? COLORS.valide : e.statut === "annule" ? COLORS.annule : COLORS.attente,
          borderColor:
            e.statut === "valide" ? COLORS.valide : e.statut === "annule" ? COLORS.annule : COLORS.attente,
        }))
      );
    } catch (err) {
      console.error("Erreur (admin) :", err);
    }
  };

  // ===== Ajout disponibilité par sélection (Agent seulement) =====
  const handleSelect = async (info) => {
    if (!(upperRole === "AGENT" || upperRole === "EMPLOYEE")) return;
    try {
      const res = await axios.post(
        `${API}/disponibilite/`,
        { agentId: user.id, start: info.startStr, end: info.endStr },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // ✅ Titre avec le nom réel de l'agent connecté
      setEvents((prev) => [
        ...prev,
        {
          title: currentAgentName,
          start: res.data.start,
          end: res.data.end,
          backgroundColor: COLORS.dispo,
          borderColor: COLORS.dispo,
        },
      ]);
    } catch (err) {
      alert("Erreur enregistrement disponibilité");
    }
  };

  const handleEventClick = (clickInfo) => {
    if (!(upperRole === "AGENT" || upperRole === "EMPLOYEE")) return;
    setSelectedRdv({
      id: clickInfo.event.id,
      title: clickInfo.event.title,
      start: clickInfo.event.start,
      end: clickInfo.event.end,
    });
    setOpenConfirm(true);
  };

  const handleDecision = async (decision) => {
    try {
      await axios.put(
        `${API}/rendezvous/agent/valider/${selectedRdv.id}`,
        { decision },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSnack({
        open: true,
        message: decision === "valider" ? "RDV accepté" : "RDV refusé",
        severity: decision === "valider" ? "success" : "warning",
      });

      setOpenConfirm(false);
      if (upperRole === "CLIENT") fetchForClient();
      else if (upperRole === "AGENT" || upperRole === "EMPLOYEE") fetchForAgent();
    } catch (error) {
      setSnack({ open: true, message: "Erreur validation", severity: "error" });
    }
  };

  return (
    <>
      {/* Légende */}
      <Box display="flex" gap={2} mb={2}>
        {(upperRole === "AGENT" || upperRole === "EMPLOYEE") && (
          <Box display="flex" alignItems="center" gap={1}>
            <Box width={12} height={12} bgcolor={COLORS.dispo} borderRadius={1} />
            <Typography>Disponibilité Employé</Typography>
          </Box>
        )}
        <Box display="flex" alignItems="center" gap={1}>
          <Box width={12} height={12} bgcolor={COLORS.valide} borderRadius={1} />
          <Typography>RDV Confirmé</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <Box width={12} height={12} bgcolor={COLORS.attente} borderRadius={1} />
          <Typography>RDV en attente</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <Box width={12} height={12} bgcolor={COLORS.annule} borderRadius={1} />
          <Typography>RDV annulé</Typography>
        </Box>
      </Box>

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        selectable={upperRole === "AGENT" || upperRole === "EMPLOYEE"}
        selectMirror
        select={handleSelect}
        events={events}
        eventClick={handleEventClick}
        height="auto"
      />

      {/* Modal validation (uniquement employé) */}
      <Modal open={openConfirm} onClose={() => setOpenConfirm(false)}>
        <MuiBox
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "white",
            p: 4,
            borderRadius: 2,
            boxShadow: 24,
          }}
        >
          <Typography variant="h6" mb={2}>
            Valider ce rendez-vous ?
          </Typography>
          <Typography mb={2}>
            Du : {new Date(selectedRdv?.start).toLocaleString()} <br />
            Au : {new Date(selectedRdv?.end).toLocaleString()}
          </Typography>
          <Button variant="contained" color="success" onClick={() => handleDecision("valider")} sx={{ mr: 2 }}>
            Accepter
          </Button>
          <Button variant="outlined" color="error" onClick={() => handleDecision("refuser")}>
            Refuser
          </Button>
        </MuiBox>
      </Modal>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })}>
        <Alert severity={snack.severity} onClose={() => setSnack({ ...snack, open: false })}>
          {snack.message}
        </Alert>
      </Snackbar>
    </>
  );
}
