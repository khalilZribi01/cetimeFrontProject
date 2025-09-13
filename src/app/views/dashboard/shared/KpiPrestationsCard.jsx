import { useEffect, useMemo, useState } from "react";
import {
  Box, Card, CardContent, Grid, Typography,
  TextField, Button, LinearProgress, Alert, Table,
  TableHead, TableRow, TableCell, TableBody
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import dayjs from "dayjs";
import axios from "axios";
import {
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer
} from "recharts";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

// palette par état
const STATE_COLORS = {
  done:        "#2e7d32",
  cancel:      "#e53935",
  draft:       "#6d6d6d",
  in_progress: "#0288d1",
  unknown:     "#bdbdbd"
};

const PRETTY = (s) => {
  const m = {
    done: "Terminé", cancel: "Annulé", draft: "Brouillon",
    in_progress: "En cours", unknown: "Inconnu"
  };
  return m[s] || s;
};

export default function KpiPrestationsParEtat() {
  const [from, setFrom] = useState(dayjs().startOf("year").format("YYYY-MM-DD"));
  const [to, setTo]     = useState(dayjs().add(1,"day").format("YYYY-MM-DD"));
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const toISO = (v) => dayjs(v, ["YYYY-MM-DD","DD/MM/YYYY"]).format("YYYY-MM-DD");

  const fetchData = async () => {
    setLoading(true); setErr("");
    try {
      const r = await axios.get(`${API_BASE}/kpi/prestations-by-state`, {
        params: { from: toISO(from), to: toISO(to) }
      });
      setRows(r.data?.rows || []);
      setTotal(r.data?.total || 0);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []); // initial

  // données pour le donut
  const chartData = useMemo(() => {
    const sorted = [...rows].sort((a,b)=>b.count-a.count);
    return sorted.map(r => ({
      name: PRETTY(r.state),
      value: Number(r.count || 0),
      pct: Number(r.pct || 0),
      rawState: r.state
    }));
  }, [rows]);

  const centerLabel = useMemo(() => {
    if (!total) return "0";
    // état majoritaire
    const top = chartData[0];
    return `${total} • ${top?.name || "—"} ${top?.pct ?? 0}%`;
  }, [chartData, total]);

  return (
    <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
      <CardContent>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md="auto">
            <Typography variant="h6" fontWeight={800}>Répartition par état</Typography>
            <Typography variant="body2" color="text.secondary">
              {total} prestations
            </Typography>
          </Grid>
          <Grid item xs />
          <Grid item xs={12} md={2.5}>
            <TextField
              type="date" size="small" fullWidth label="Du"
              value={from} onChange={(e)=>setFrom(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={2.5}>
            <TextField
              type="date" size="small" fullWidth label="Au"
              value={to} onChange={(e)=>setTo(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md="auto">
            <Button variant="contained" size="small" startIcon={<PlayArrowIcon/>}
              onClick={fetchData} sx={{ minWidth: 140 }}>
              Actualiser
            </Button>
          </Grid>
        </Grid>

        {loading ? (
          <Box mt={2}><LinearProgress/></Box>
        ) : err ? (
          <Box mt={2}><Alert severity="error">{err}</Alert></Box>
        ) : (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={7}>
              <Box sx={{ height: 330 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={2}
                      label={(e)=>`${e.name} ${e.pct}%`}
                    >
                      {chartData.map((d, i) => (
                        <Cell key={i} fill={STATE_COLORS[d.rawState] || "#90caf9"} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip formatter={(v, n, p)=>[
                      `${v} (${p.payload.pct}%)`, p.payload.name
                    ]}/>
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <Box sx={{
                position:"relative", top:"-210px", textAlign:"center", pointerEvents:"none"
              }}>
                <Typography variant="subtitle1" fontWeight={700}>{centerLabel}</Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={5}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>État</TableCell>
                    <TableCell align="right">Nb</TableCell>
                    <TableCell align="right">%</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {chartData.map((r)=>(
                    <TableRow key={r.rawState}>
                      <TableCell>
                        <Box sx={{ display:"inline-block", width:10, height:10,
                                   bgcolor: STATE_COLORS[r.rawState] || "#90caf9",
                                   borderRadius:0.5, mr:1 }}/>
                        {r.name}
                      </TableCell>
                      <TableCell align="right">{r.value}</TableCell>
                      <TableCell align="right">{r.pct}%</TableCell>
                    </TableRow>
                  ))}
                  {chartData.length===0 && (
                    <TableRow><TableCell colSpan={3}>Aucune donnée</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Grid>
          </Grid>
        )}
      </CardContent>
    </Card>
  );
}
