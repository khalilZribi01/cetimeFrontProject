import { useState, useEffect } from "react";
import axios from "axios";

export default function useNotification() {
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get("http://localhost:4000/notifications/gmail");
      const formatted = res.data.map((mail) => ({
        id: mail.id,
        heading: mail.from,
        title: mail.subject,
        subtitle: new Date(mail.date).toLocaleString(),
        timestamp: mail.date,
        path: "#", // Ou lien interne si besoin
        icon: { name: "mail", color: "primary" }
      }));
      setNotifications(formatted);
    } catch (err) {
      console.error("Erreur de récupération des mails:", err);
    }
  };

  const deleteNotification = (id) => setNotifications((prev) => prev.filter((n) => n.id !== id));

  const clearNotifications = () => setNotifications([]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  return { notifications, deleteNotification, clearNotifications };
}
