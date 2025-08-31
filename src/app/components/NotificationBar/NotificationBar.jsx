import { Fragment, useState } from "react";
import { Link } from "react-router-dom";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Badge from "@mui/material/Badge";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import styled from "@mui/material/styles/styled";
import IconButton from "@mui/material/IconButton";
import ThemeProvider from "@mui/material/styles/ThemeProvider";
import Notifications from "@mui/icons-material/Notifications";
import Clear from "@mui/icons-material/Clear";

import useSettings from "app/hooks/useSettings";
import useNotification from "app/hooks/useNotification";
import { getTimeDifference } from "app/utils/utils.js";
import { sideNavWidth, topBarHeight } from "app/utils/constant";
import { Paragraph, Small } from "../Typography";

// Header de la liste
const Notification = styled("div")(() => ({
  padding: "16px",
  marginBottom: "16px",
  display: "flex",
  alignItems: "center",
  height: topBarHeight,
  boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.05)",
  "& h5": {
    marginLeft: "8px",
    marginTop: 0,
    marginBottom: 0,
    fontWeight: "500"
  }
}));

// Carte notification
const NotificationCard = styled(Box)(() => ({
  position: "relative",
  "&:hover": {
    "& .messageTime": { display: "none" },
    "& .deleteButton": { opacity: "1" }
  }
}));

// Bouton de suppression
const DeleteButton = styled(IconButton)(() => ({
  opacity: "0",
  position: "absolute",
  right: 5,
  marginTop: 9,
  marginRight: "24px",
  background: "rgba(0, 0, 0, 0.01)"
}));

export default function NotificationBar({ container }) {
  const { settings } = useSettings();
  const [panelOpen, setPanelOpen] = useState(false);
  const { deleteNotification, clearNotifications, notifications } = useNotification();

  const handleDrawerToggle = () => setPanelOpen(!panelOpen);

  return (
    <Fragment>
      <IconButton onClick={handleDrawerToggle}>
        <Badge color="secondary" badgeContent={notifications?.length}>
          <Notifications sx={{ color: "text.primary" }} />
        </Badge>
      </IconButton>

      <ThemeProvider theme={settings.themes[settings.activeTheme]}>
        <Drawer
          width={"100px"}
          container={container}
          variant="temporary"
          anchor={"right"}
          open={panelOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
        >
          <Box sx={{ width: sideNavWidth }}>
            {/* Header */}
            <Notification>
              <Notifications color="primary" />
              <h5>Notifications</h5>
            </Notification>

            {/* Liste des notifications */}
            {notifications?.map((notification) => (
              <NotificationCard key={notification.id}>
                <DeleteButton
                  size="small"
                  className="deleteButton"
                  onClick={() => deleteNotification(notification.id)}
                >
                  <Clear className="icon" />
                </DeleteButton>

                <Link
                  to={`/${notification.path}`}
                  onClick={handleDrawerToggle}
                  style={{ textDecoration: "none" }}
                >
                  <Card
                    sx={{
                      mx: 2,
                      mb: 2,
                      borderRadius: 3,
                      boxShadow: 3,
                      transition: "0.3s",
                      "&:hover": {
                        boxShadow: 6,
                        backgroundColor: "#f8f9fa"
                      }
                    }}
                  >
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      p={1.5}
                      sx={{ borderBottom: "1px solid #eee" }}
                    >
                      <Box display="flex" alignItems="center">
                        <Icon sx={{ color: "#1976d2", mr: 1 }}>
                          {notification.icon.name}
                        </Icon>
                        <Box>
                          <Paragraph sx={{ fontWeight: 600 }}>
                            {notification.heading}
                          </Paragraph>
                          <Small color="text.secondary">
                            {notification.subtitle}
                          </Small>
                        </Box>
                      </Box>

                      <Small sx={{ color: "gray", whiteSpace: "nowrap" }}>
                        {getTimeDifference(new Date(notification.timestamp))} ago
                      </Small>
                    </Box>

                    <Box px={2} py={1}>
                      <Paragraph m={0}>{notification.title}</Paragraph>
                      <Small color="text.secondary">
                        {new Date(notification.timestamp).toLocaleString()}
                      </Small>
                    </Box>
                  </Card>
                </Link>
              </NotificationCard>
            ))}

            {/* Bouton Clear */}
            {!!notifications?.length && (
              <Button
                fullWidth
                variant="text"
                color="primary"
                sx={{
                  fontWeight: "bold",
                  mt: 1,
                  mb: 2,
                  textTransform: "none",
                  "&:hover": {
                    backgroundColor: "#f0f0f0"
                  }
                }}
                onClick={clearNotifications}
              >
                Effacer les notifications
              </Button>
            )}
          </Box>
        </Drawer>
      </ThemeProvider>
    </Fragment>
  );
}
