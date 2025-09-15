import { useEffect, useState, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Box, Typography, Stack, Chip } from "@mui/material";
import axios from "axios";
import useAuth from "app/hooks/useAuth";

const API = "http://localhost:4000";

const COLORS = {
  dispoBg: "#c8e6c9",
  dispoBr: "#81c784",
  attente: "#ff9800",
  valide:  "#4caf50",
  annule:  "#f44336",
  bloque:  "#ffcdd2",
};

export default function ClientReservationCalendar() {
  const [events, setEvents] = useState([]);
  const [disponibilites, setDisponibilites] = useState([]);
  const [joursBloques, setJoursBloques] = useState([]);
  const { role, user } = useAuth();
  const token = localStorage.getItem("token");

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const fetchAll = useCallback(async () => {
    try {
      // 1) Disponibilités (publiques chez toi – garde si besoin d'auth)
      const dispoRes = await axios.get(`${API}/disponibilite/all`);
      const dispoData = Array.isArray(dispoRes.data) ? dispoRes.data : [];
      setDisponibilites(dispoData);

      // 2) Jours sans dispo (prochaines 30j)
      const joursAvecDispo = new Set(dispoData.map(d => new Date(d.start).toDateString()));
      const joursFuturs = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() + i);
        return d.toDateString();
      });
      const nonDispo = joursFuturs.filter(j => !joursAvecDispo.has(j));
      setJoursBloques(nonDispo);

      // 3) RDVs du client
      const rdvRes = await axios.get(`${API}/rendezvous/client`, authHeader);
      const rdvs = Array.isArray(rdvRes.data) ? rdvRes.data : [];

      const rdvEvents = rdvs.map((rdv) => {
        const start = new Date(rdv.dateRdv || rdv.start);
        const end = rdv.end
          ? new Date(rdv.end)
          : new Date(start.getTime() + (rdv.duree || 0) * 60000);

        // mapping couleur par statut
        let color = COLORS.attente;
        let title = "⏳ RDV en attente";

        if (rdv.statut === "valide") {
          color = COLORS.valide;
          title = "✅ RDV confirmé";
        } else if (rdv.statut === "annule") {
          color = COLORS.annule;
          title = "❌ RDV annulé";
        }

        return {
          id: `rdv-${rdv.id}`,
          title,
          start: start.toISOString(),
          end: end.toISOString(),
          backgroundColor: color,
          borderColor: color,
          // marque le type d'event pour éviter les clics
          extendedProps: { kind: "rdv", statut: rdv.statut },
        };
      });

      // 4) Events “créneau disponible” (cliquables)
      const dispoEvents = dispoData.map((d) => ({
        id: `dispo-${d.id ?? `${d.agentId}-${d.start}`}`,
        title: "🟢 Créneau disponible",
        start: d.start,
        end: d.end,
        backgroundColor: COLORS.dispoBg,
        borderColor: COLORS.dispoBr,
        extendedProps: { kind: "dispo" },
      }));

      setEvents([...rdvEvents, ...dispoEvents]);
    } catch (err) {
      console.error("Erreur chargement données:", err);
    }
  }, [token]);

  useEffect(() => {
    if (role === "CLIENT" && user?.id) {
      fetchAll();
      // rafraîchir quand l'utilisateur revient sur l'onglet (annulation admin)
      const onFocus = () => fetchAll();
      window.addEventListener("focus", onFocus);
      return () => window.removeEventListener("focus", onFocus);
    }
  }, [role, user?.id, fetchAll]);

  const isDateSelectable = (selectInfo) => {
    const selectedDay = new Date(selectInfo.start).toDateString();
    return !joursBloques.includes(selectedDay);
  };

  const handleEventClick = async (clickInfo) => {
    const { extendedProps, start, end } = clickInfo.event;
    if (extendedProps?.kind !== "dispo") return; // clique autorisé UNIQUEMENT sur créneau disponible

    const startTime = new Date(start);
    const endTime = new Date(end);
    const dureeMinutes = (endTime - startTime) / (1000 * 60);

    const ok = window.confirm(
      `Souhaitez-vous réserver le créneau du ${startTime.toLocaleString()} ?`
    );
    if (!ok) return;

    try {
      await axios.post(
        `${API}/rendezvous/reserver`,
        { dateRdv: startTime.toISOString(), duree: dureeMinutes },
        authHeader
      );

      alert("✅ Réservation enregistrée ! En attente de confirmation.");
      // re-fetch pour refléter l'état (et laisser le backend décider du statut)
      fetchAll();
    } catch (err) {
      alert(err?.response?.data?.message || "❌ Erreur lors de la réservation.");
      console.error(err);
    }
  };

  // événements “jour bloqué” (fond rouge clair)
  const blockedEvents = joursBloques.map((day) => {
    const date = new Date(day);
    date.setHours(0, 0, 0, 0);
    return {
      id: `blocked-${date.toISOString()}`,
      title: "🚫 Aucun agent disponible",
      start: date.toISOString(),
      allDay: true,
      display: "background",
      backgroundColor: COLORS.bloque,
      overlap: false,
    };
  });

  return (
    <Box m={2}>
      <Typography variant="h5" gutterBottom>
        Réserver un rendez-vous
      </Typography>

      {/* Légende */}
      <Stack direction="row" spacing={2} mb={2}>
        <Chip label="🟢 Créneau disponible" style={{ backgroundColor: COLORS.dispoBg }} />
        <Chip label="✅ RDV confirmé" style={{ backgroundColor: COLORS.valide, color: "#fff" }} />
        <Chip label="⏳ RDV en attente" style={{ backgroundColor: COLORS.attente, color: "#fff" }} />
        <Chip label="❌ RDV annulé" style={{ backgroundColor: COLORS.annule, color: "#fff" }} />
        <Chip label="🚫 Jour non réservable" style={{ backgroundColor: COLORS.bloque }} />
      </Stack>

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        eventClick={handleEventClick}
        selectAllow={isDateSelectable}
        events={[...events, ...blockedEvents]}
        allDaySlot={false}
        height="auto"
        eventDisplay="auto"
      />
    </Box>
  );
}
