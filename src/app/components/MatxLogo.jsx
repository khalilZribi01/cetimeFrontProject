import useSettings from "app/hooks/useSettings";

export default function MatxLogo({ className }) {
  const { settings } = useSettings();
  const theme = settings.themes[settings.activeTheme]; // 👈 tu peux garder si tu utilises le thème ailleurs

  return (
    <img
      src="/assets/images/logo.png"
      alt="Matx Logo"
      className={className}
      width="100"
      height="100"
      style={{ objectFit: "contain" }}
    />
  );
}
