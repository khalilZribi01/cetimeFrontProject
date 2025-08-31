// components/shared/Doughnut.jsx
import ReactEcharts from "echarts-for-react";
import { useTheme } from "@mui/material/styles";

export default function DoughnutChart({
  height = 240,
  data = [],                 
  colors = [],               
  showCenterTotal = true,
}) {
  const theme = useTheme();
  const total = (data || []).reduce((a, b) => a + Number(b?.value || 0), 0);

  const option = {
    color: colors.length ? colors : undefined,
    tooltip: { 
      trigger: "item", 
      backgroundColor: "#fff",
      borderColor: theme.palette.divider,
      borderWidth: 1,
      textStyle: { color: theme.palette.text.primary },
      formatter: ({ name, value, percent }) => {
        return `<b>${name}</b><br/>Valeur : ${value.toLocaleString()}<br/>${percent}%`;
      }
    },
    legend: { show: false },
    series: [
      {
        type: "pie",
        radius: ["48%", "72%"],
        center: ["50%", "50%"],
        label: { show: false },
        labelLine: { show: false },
        data,
      },
    ],
    graphic: showCenterTotal
      ? [
          {
            type: "text",
            left: "center",
            top: "47%",
            style: {
              text: String(total),
              textAlign: "center",
              fill: theme.palette.text.primary,
              fontSize: 18,
              fontWeight: 700,
            },
          },
          {
            type: "text",
            left: "center",
            top: "60%",
            style: {
              text: "Total",
              textAlign: "center",
              fill: theme.palette.text.secondary,
              fontSize: 12,
            },
          },
        ]
      : undefined,
  };

  return <ReactEcharts style={{ height }} option={option} />;
}
