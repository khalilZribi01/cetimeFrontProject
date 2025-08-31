import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Box, Typography, Stack, Chip } from "@mui/material";
import axios from "axios";
import useAuth from "app/hooks/useAuth";

export default function ClientReservationCalendar() {
  const [events, setEvents] = useState([]);
  const [disponibilites, setDisponibilites] = useState([]);
  const [joursBloques, setJoursBloques] = useState([]);
  const { role, user } = useAuth();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (role === "CLIENT" && user?.id) {
      const fetchAll = async () => {
        try {
          // 1. Récupérer les disponibilités
          const dispoRes = await axios.get("http://localhost:4000/disponibilite/all");
          const disponibilitesData = dispoRes.data;

          // 2. Identifier les jours sans disponibilités
          const joursAvecDispo = new Set(
            disponibilitesData.map((d) => new Date(d.start).toDateString())
          );

          const joursFuturs = Array.from({ length: 30 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() + i);
            return d.toDateString();
          });

          const joursNonDispo = joursFuturs.filter((j) => !joursAvecDispo.has(j));
          setJoursBloques(joursNonDispo);
          setDisponibilites(disponibilitesData);

          // 3. Récupérer les RDVs client
          const res = await axios.get("http://localhost:4000/rendezvous/client", {
            headers: { Authorization: `Bearer ${token}` }
          });

          const rdvEvents = res.data.map((rdv) => {
            const start = new Date(rdv.dateRdv || rdv.start);
            const end = new Date(start.getTime() + rdv.duree * 60000);

            const isMatchedDispo = disponibilitesData.some((d) => {
              const dStart = new Date(d.start);
              const dEnd = new Date(d.end);
              return start.getTime() === dStart.getTime() && end.getTime() === dEnd.getTime();
            });

            let color = "#ff9800"; // RDV en attente
            let title = "⏳ En attente de confirmation";

            if (rdv.statut === "valide") {
              color = "#4caf50";
              title = "✅ RDV confirmé";
            } else if (!isMatchedDispo) {
              color = "#f44336"; // rouge
              title = "❌ Créneau hors disponibilité";
            }

            return {
              title,
              start: start.toISOString(),
              end: end.toISOString(),
              backgroundColor: color,
              borderColor: color
            };
          });

          const dispoEvents = disponibilitesData.map((d) => ({
            title: "🟢 Créneau disponible",
            start: d.start,
            end: d.end,
            backgroundColor: "#c8e6c9",
            borderColor: "#81c784"
          }));

          setEvents([...rdvEvents, ...dispoEvents]);
        } catch (err) {
          console.error("Erreur chargement données:", err);
        }
      };

      fetchAll();
    }
  }, [role, user?.id]);

  const isDateSelectable = (selectInfo) => {
    const selectedDay = new Date(selectInfo.start).toDateString();
    return !joursBloques.includes(selectedDay);
  };

  const handleEventClick = async (clickInfo) => {
    const { start, end, title } = clickInfo.event;

    if (!title.includes("🟢")) return;

    const startTime = new Date(start);
    const endTime = new Date(end);
    const dureeMinutes = (endTime - startTime) / (1000 * 60);

    const confirm = window.confirm(
      `Souhaitez-vous réserver le créneau du ${startTime.toLocaleString()} ?`
    );

    if (!confirm) return;

    try {
      await axios.post(
        "http://localhost:4000/rendezvous/reserver",
        { dateRdv: startTime.toISOString(), duree: dureeMinutes },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("✅ Réservation enregistrée ! En attente de confirmation.");

      setEvents((prev) => [
        ...prev,
        {
          title: "⏳ En attente de confirmation",
          start: startTime.toISOString(),
          end: endTime.toISOString(),
          backgroundColor: "#ff9800",
          borderColor: "#ff9800"
        }
      ]);
    } catch (err) {
      alert("❌ Erreur lors de la réservation.");
      console.error(err);
    }
  };

  const blockedEvents = joursBloques.map((day) => {
    const date = new Date(day);
    date.setHours(0, 0, 0, 0);
    return {
      title: "🚫 Aucun agent disponible",
      start: date.toISOString(),
      allDay: true,
      display: "background",
      backgroundColor: "#ffcdd2",
      overlap: false
    };
  });

  return (
    <Box m={2}>
      <Typography variant="h5" gutterBottom>
        Réserver un rendez-vous
      </Typography>

      {/* 🔷 Légende */}
      <Stack direction="row" spacing={2} mb={2}>
        <Chip label="🟢 Créneau disponible" style={{ backgroundColor: "#c8e6c9" }} />
        <Chip label="✅ RDV confirmé" style={{ backgroundColor: "#4caf50", color: "#fff" }} />
        <Chip label="⏳ RDV en attente" style={{ backgroundColor: "#ff9800", color: "#fff" }} />
        <Chip label="🚫 Jour non réservable" style={{ backgroundColor: "#ffcdd2" }} />
      </Stack>

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay"
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
