"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  getHallazgos, deleteHallazgo, registrarAuditoria,
  type Hallazgo, type Severidad, type Estado,
} from "@/lib/api";
import { colorSeveridad, colorEstado } from "@/lib/types";
import { logger } from "@/lib/logger";

const SEVERIDADES: Severidad[] = ["Crítica", "Alta", "Media", "Baja"];
const ESTADOS:     Estado[]    = ["Nuevo", "En análisis", "En remediación", "Mitigado", "Cerrado"];
const emojiSeveridad: Record<string, string> = {
  "Crítica": "🔴", "Alta": "🟠", "Media": "🟡", "Baja": "🟢",
};

interface Filtros {
  severidades: Set<Severidad>;
  estados:     Set<Estado>;
  activo:      string;
  desde:       string;
  hasta:       string;
}
const filtrosVacios = (): Filtros => ({
  severidades: new Set(), estados: new Set(), activo: "", desde: "", hasta: "",
});

// ── Donut chart ────────────────────────────────────────────────
interface SliceData { label: string; value: number; color: string; }

function buildSlices(data: SliceData[]) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return { slices: [], total: 0 };
  let angle = -Math.PI / 2;
  const slices = data.filter(d => d.value > 0).map(d => {
    const sweep = (d.value / total) * 2 * Math.PI;
    const s = { ...d, startAngle: angle, endAngle: angle + sweep, pct: Math.round((d.value / total) * 100) };
    angle += sweep;
    return s;
  });
  return { slices, total };
}

function donutPath(cx: number, cy: number, r: number, ri: number, start: number, end: number) {
  if (end - start >= 2 * Math.PI - 0.001) {
    return [
      `M ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} Z`,
      `M ${cx + ri} ${cy} A ${ri} ${ri} 0 1 0 ${cx - ri} ${cy} A ${ri} ${ri} 0 1 0 ${cx + ri} ${cy} Z`,
    ].join(" ");
  }
  const la = end - start > Math.PI ? 1 : 0;
  const x1o = cx + r  * Math.cos(start), y1o = cy + r  * Math.sin(start);
  const x2o = cx + r  * Math.cos(end),   y2o = cy + r  * Math.sin(end);
  const x1i = cx + ri * Math.cos(end),   y1i = cy + ri * Math.sin(end);
  const x2i = cx + ri * Math.cos(start), y2i = cy + ri * Math.sin(start);
  return `M ${x1o} ${y1o} A ${r} ${r} 0 ${la} 1 ${x2o} ${y2o} L ${x1i} ${y1i} A ${ri} ${ri} 0 ${la} 0 ${x2i} ${y2i} Z`;
}

interface DonutChartProps {
  title: string; data: SliceData[]; svgRef: React.RefObject<SVGSVGElement | null>;
}
function DonutChart({ title, data, svgRef }: DonutChartProps) {
  const { slices, total } = buildSlices(data);
  const cx = 55, cy = 55, r = 48, ri = 28;
  return (
    <div>
      <p style={{ fontSize: 10, color: "#6b6b94", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.75rem", fontWeight: 500 }}>
        {title}
      </p>
      {total === 0 ? (
        <div style={{ textAlign: "center", color: "#44445e", padding: "1rem 0", fontSize: 12 }}>Sin datos</div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <svg ref={svgRef} width="110" height="110" viewBox="0 0 110 110" style={{ flexShrink: 0 }}>
            {slices.map((s, i) => (
              <path key={i} d={donutPath(cx, cy, r, ri, s.startAngle, s.endAngle)}
                fill={s.color} stroke="rgba(10,10,15,0.8)" strokeWidth="1.2" />
            ))}
            <text x={cx} y={cy - 5} textAnchor="middle" fill="#f0f0f5" fontSize="18" fontWeight="700" fontFamily="sans-serif">{total}</text>
            <text x={cx} y={cy + 9}  textAnchor="middle" fill="#64648a" fontSize="8"  fontFamily="sans-serif">total</text>
          </svg>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px", flex: 1, minWidth: 0 }}>
            {slices.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: 11 }}>
                <span style={{ width: 7, height: 7, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                <span style={{ color: "#c8c8e0", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</span>
                <span style={{ color: "#64648a", flexShrink: 0 }}>{s.value}</span>
                <span style={{ color: s.color, fontWeight: 700, minWidth: 32, textAlign: "right", flexShrink: 0 }}>{s.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Bar chart por fecha ────────────────────────────────────────
interface BarChartProps {
  data: { date: string; count: number }[];
  svgRef: React.RefObject<SVGSVGElement | null>;
}
function BarChart({ data, svgRef }: BarChartProps) {
  const W = 260, H = 110, ML = 22, MB = 28, MT = 8, MR = 8;
  const innerW = W - ML - MR;
  const innerH = H - MT - MB;
  const maxVal = Math.max(...data.map(d => d.count), 1);
  const barW   = Math.max(4, Math.min(24, innerW / data.length - 3));

  const yTicks = maxVal <= 4
    ? Array.from({ length: maxVal + 1 }, (_, i) => i)
    : [0, Math.ceil(maxVal / 2), maxVal];

  function formatDate(d: string) {
    const parts = d.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    return d;
  }

  // Skip labels if too crowded — show every Nth
  const labelStep = data.length <= 7 ? 1 : data.length <= 14 ? 2 : Math.ceil(data.length / 7);

  return (
    <div>
      <p style={{ fontSize: 10, color: "#6b6b94", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.75rem", fontWeight: 500 }}>
        Hallazgos por Día
      </p>
      {data.length === 0 ? (
        <div style={{ textAlign: "center", color: "#44445e", padding: "1rem 0", fontSize: 12 }}>Sin datos</div>
      ) : (
        <svg ref={svgRef} width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
          {/* Grid lines + Y labels */}
          {yTicks.map(v => {
            const y = MT + innerH - (v / maxVal) * innerH;
            return (
              <g key={v}>
                <line x1={ML} y1={y} x2={ML + innerW} y2={y}
                  stroke={v === 0 ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)"}
                  strokeWidth={v === 0 ? 1 : 0.5} strokeDasharray={v === 0 ? "none" : "3 3"} />
                <text x={ML - 3} y={y + 3.5} textAnchor="end" fill="#44445e" fontSize="8" fontFamily="sans-serif">{v}</text>
              </g>
            );
          })}

          {/* Bars */}
          {data.map((d, i) => {
            const x  = ML + (i / data.length) * innerW + (innerW / data.length - barW) / 2;
            const bh = Math.max(2, (d.count / maxVal) * innerH);
            const y  = MT + innerH - bh;
            const showLabel = i % labelStep === 0;
            return (
              <g key={d.date}>
                <rect x={x} y={y} width={barW} height={bh} rx="2"
                  fill="url(#barGrad)" opacity="0.9" />
                {/* Count on top */}
                {d.count > 0 && (
                  <text x={x + barW / 2} y={y - 2} textAnchor="middle" fill="#a5b4fc" fontSize="8" fontFamily="sans-serif" fontWeight="600">
                    {d.count}
                  </text>
                )}
                {/* Date label */}
                {showLabel && (
                  <text x={x + barW / 2} y={H - MB + 10} textAnchor="middle" fill="#44445e" fontSize="7.5" fontFamily="sans-serif">
                    {formatDate(d.date)}
                  </text>
                )}
              </g>
            );
          })}

          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#818cf8" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.6" />
            </linearGradient>
          </defs>
        </svg>
      )}
    </div>
  );
}

// ── PDF helpers ────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}
async function svgToDataUrl(svgEl: SVGSVGElement, w = 320, h = 320): Promise<string> {
  return new Promise(resolve => {
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    const svgData = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const img  = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(""); };
    img.src = url;
  });
}

// ── Componente principal ───────────────────────────────────────
export default function HallazgosAdmin() {
  const { user, nombre, rol, loading: authLoading } = useAuth();
  const router = useRouter();

  const [hallazgos,    setHallazgos]    = useState<Hallazgo[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [eliminando,   setEliminando]   = useState<string | null>(null);
  const [filtros,      setFiltros]      = useState<Filtros>(filtrosVacios());
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [exportando,   setExportando]   = useState(false);

  const svgSeveridadRef = useRef<SVGSVGElement>(null);
  const svgEstadoRef    = useRef<SVGSVGElement>(null);
  const svgBarRef       = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading]);

  useEffect(() => {
    if (!user) return;
    getHallazgos()
      .then(setHallazgos)
      .catch(e => logger.error("Error cargando hallazgos:", e))
      .finally(() => setLoading(false));
  }, [user]);

  function toggleSeveridad(s: Severidad) {
    setFiltros(prev => {
      const next = new Set(prev.severidades);
      next.has(s) ? next.delete(s) : next.add(s);
      return { ...prev, severidades: next };
    });
  }
  function toggleEstado(e: Estado) {
    setFiltros(prev => {
      const next = new Set(prev.estados);
      next.has(e) ? next.delete(e) : next.add(e);
      return { ...prev, estados: next };
    });
  }

  const hallazgosFiltrados = hallazgos.filter(h => {
    if (filtros.severidades.size > 0 && !filtros.severidades.has(h.severidad)) return false;
    if (filtros.estados.size     > 0 && !filtros.estados.has(h.estado))        return false;
    if (filtros.activo && !h.activo.toLowerCase().includes(filtros.activo.toLowerCase())) return false;
    if (filtros.desde  && h.fecha < filtros.desde) return false;
    if (filtros.hasta  && h.fecha > filtros.hasta) return false;
    return true;
  });

  const chipsActivos = filtros.severidades.size + filtros.estados.size + (filtros.activo ? 1 : 0);
  const totalActivos = chipsActivos + (filtros.desde ? 1 : 0) + (filtros.hasta ? 1 : 0);

  const dataSeveridad = useMemo<SliceData[]>(() =>
    SEVERIDADES.map(s => ({
      label: s, value: hallazgosFiltrados.filter(h => h.severidad === s).length, color: colorSeveridad[s],
    })), [hallazgosFiltrados]);

  const dataEstado = useMemo<SliceData[]>(() =>
    ESTADOS.map(e => ({
      label: e, value: hallazgosFiltrados.filter(h => h.estado === e).length, color: colorEstado[e],
    })), [hallazgosFiltrados]);

  const dataBarras = useMemo(() => {
    const counts: Record<string, number> = {};
    hallazgosFiltrados.forEach(h => { counts[h.fecha] = (counts[h.fecha] ?? 0) + 1; });
    return Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));
  }, [hallazgosFiltrados]);

  const criticos = hallazgosFiltrados.filter(h => h.severidad === "Crítica").length;
  const cerrados = hallazgosFiltrados.filter(h => h.estado   === "Cerrado").length;

  async function handleEliminar(id: string, activo: string) {
    if (!confirm("¿Seguro que deseas eliminar este hallazgo?")) return;
    setEliminando(id);
    try {
      await deleteHallazgo(id);
      await registrarAuditoria(nombre ?? user?.uid ?? "desconocido", "ELIMINAR_HALLAZGO",
        `Hallazgo eliminado — ID: ${id} — Activo: ${activo}`);
      setHallazgos(prev => prev.filter(h => h.id !== id));
    } catch (e) {
      logger.error("Error eliminando:", e);
    } finally {
      setEliminando(null);
    }
  }

  async function exportPDF() {
    if (hallazgosFiltrados.length === 0) return;
    setExportando(true);
    try {
      const { jsPDF }              = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const W = 210, M = 14;
      let y = M;

      // Cabecera
      doc.setFillColor(15, 15, 22);
      doc.rect(0, 0, W, 28, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(240, 240, 245);
      doc.text("Reporte de Hallazgos de Seguridad", M, 13);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(100, 100, 138);
      doc.text("Infopuntos · SistemaCC", M, 22);
      y = 36;

      // Metadata
      doc.setFontSize(8); doc.setTextColor(80, 80, 110);
      doc.text(`Generado: ${new Date().toLocaleString("es-CL")}`, M, y);
      doc.text(`Usuario: ${nombre ?? "—"}  ·  Rol: ${rol ?? "—"}  ·  Registros: ${hallazgosFiltrados.length}`, M, y + 5);
      const fp: string[] = [];
      if (filtros.severidades.size > 0) fp.push(`Severidad: ${[...filtros.severidades].join(", ")}`);
      if (filtros.estados.size     > 0) fp.push(`Estado: ${[...filtros.estados].join(", ")}`);
      if (filtros.activo)               fp.push(`Activo: ${filtros.activo}`);
      if (filtros.desde)                fp.push(`Desde: ${filtros.desde}`);
      if (filtros.hasta)                fp.push(`Hasta: ${filtros.hasta}`);
      if (fp.length > 0) { y += 4; doc.text(`Filtros: ${fp.join("  ·  ")}`, M, y + 5); }
      y += 13;

      // Cards resumen
      const cards = [
        { label: "Total", value: hallazgosFiltrados.length, color: [99, 102, 241] as [number,number,number] },
        { label: "Críticos",  value: criticos, color: [239, 68,  68]  as [number,number,number] },
        { label: "Cerrados",  value: cerrados, color: [107, 114, 128] as [number,number,number] },
      ];
      const cW = (W - M * 2 - 8) / 3;
      cards.forEach((c, i) => {
        const cx = M + i * (cW + 4);
        doc.setFillColor(242, 242, 252); doc.roundedRect(cx, y, cW, 18, 2, 2, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(...c.color);
        doc.text(String(c.value), cx + cW / 2, y + 11, { align: "center" });
        doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(100, 100, 130);
        doc.text(c.label, cx + cW / 2, y + 16, { align: "center" });
      });
      y += 24;

      // Sección gráficos — donuts
      doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(99, 102, 241);
      doc.text("Distribución", M, y);
      doc.setDrawColor(99, 102, 241); doc.setLineWidth(0.3); doc.line(M + 28, y - 1, W - M, y - 1);
      y += 4;

      const donutSize = 52;
      const halfW     = (W - M * 2 - 6) / 2;

      async function drawDonut(svgEl: SVGSVGElement | null, data: SliceData[], ox: number, label: string) {
        if (!svgEl || hallazgosFiltrados.length === 0) return;
        const url = await svgToDataUrl(svgEl, 220, 220);
        if (!url) return;
        doc.addImage(url, "PNG", ox, y, donutSize, donutSize);
        doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(100, 100, 130);
        doc.text(label, ox + donutSize / 2, y + donutSize + 3.5, { align: "center" });
        let ly = y + 3;
        data.filter(d => d.value > 0).forEach(d => {
          const pct  = Math.round((d.value / hallazgosFiltrados.length) * 100);
          const [r, g, b] = hexToRgb(d.color);
          doc.setFillColor(r, g, b); doc.rect(ox + donutSize + 3, ly - 2.5, 2.5, 2.5, "F");
          doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(50, 50, 70);
          doc.text(`${d.label}: ${d.value} (${pct}%)`, ox + donutSize + 7.5, ly);
          ly += 5;
        });
      }

      await drawDonut(svgSeveridadRef.current, dataSeveridad, M,              "Por Severidad");
      await drawDonut(svgEstadoRef.current,    dataEstado,    M + halfW + 3,  "Por Estado");
      y += donutSize + 8;

      // Bar chart
      if (svgBarRef.current && dataBarras.length > 0) {
        doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(99, 102, 241);
        doc.text("Hallazgos por Día", M, y);
        doc.setDrawColor(99, 102, 241); doc.setLineWidth(0.3); doc.line(M + 38, y - 1, W - M, y - 1);
        y += 4;
        const barUrl = await svgToDataUrl(svgBarRef.current, 560, 240);
        if (barUrl) {
          doc.addImage(barUrl, "PNG", M, y, W - M * 2, (W - M * 2) * 240 / 560);
          y += (W - M * 2) * 240 / 560 + 6;
        }
      }

      // Tabla
      doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(99, 102, 241);
      doc.text("Listado de Hallazgos", M, y);
      doc.setDrawColor(99, 102, 241); doc.setLineWidth(0.3); doc.line(M + 43, y - 1, W - M, y - 1);
      y += 3;

      autoTable(doc, {
        startY: y,
        head: [["Fecha", "Activo", "Tipo", "Severidad", "Estado", "Creado por"]],
        body: hallazgosFiltrados.map(h => [h.fecha, h.activo, h.tipo, h.severidad, h.estado, h.nombreCreador]),
        styles: { fontSize: 8, cellPadding: 3, overflow: "ellipsize", textColor: [40, 40, 60] },
        headStyles: { fillColor: [15, 15, 22], textColor: [165, 180, 252], fontStyle: "bold", fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 245, 252] },
        columnStyles: {
          0: { cellWidth: 22 }, 1: { cellWidth: 28 }, 2: { cellWidth: 44 },
          3: { cellWidth: 22 }, 4: { cellWidth: 28 }, 5: { cellWidth: 34 },
        },
        margin: { left: M, right: M },
        didDrawPage: (data) => {
          doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(160, 160, 190);
          doc.text(`SistemaCC · ${new Date().toLocaleDateString("es-CL")} · Página ${data.pageNumber}`, W / 2, 291, { align: "center" });
        },
      });

      doc.save(`reporte-hallazgos-${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (err) {
      logger.error("Error generando PDF:", err);
    } finally {
      setExportando(false);
    }
  }

  const dateInputStyle = (activo: boolean): React.CSSProperties => ({
    background: activo ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.03)",
    border: `1px solid ${activo ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.08)"}`,
    borderRadius: 8, padding: "7px 12px",
    color: "#e8e8f0", fontSize: 13, fontFamily: "inherit",
    outline: "none", colorScheme: "dark" as any,
  });

  if (authLoading || loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0f", color: "#818cf8" }}>
      Cargando hallazgos...
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#f0f0f5", fontFamily: "DM Sans, sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Navbar */}
      <nav style={{
        borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "0 2rem",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: "60px", background: "rgba(15,15,22,0.9)", backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => router.push("/panel-admin")} style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, padding: "6px 14px", color: "#e8e8f0",
            fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          }}>← Volver</button>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Hallazgos</span>
          <span style={{
            background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)",
            borderRadius: 100, padding: "2px 10px", fontSize: 11, color: "#a5b4fc",
          }}>{hallazgosFiltrados.length} registros</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button onClick={exportPDF} disabled={exportando || hallazgosFiltrados.length === 0} style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)",
            borderRadius: 8, padding: "7px 14px", color: "#a5b4fc",
            fontSize: 13, cursor: exportando || hallazgosFiltrados.length === 0 ? "not-allowed" : "pointer",
            fontFamily: "inherit", opacity: hallazgosFiltrados.length === 0 ? 0.5 : 1, transition: "all 0.15s",
          }}>
            {exportando ? (
              <>
                <span style={{
                  display: "inline-block", width: 12, height: 12,
                  border: "2px solid rgba(165,180,252,0.3)", borderTopColor: "#a5b4fc",
                  borderRadius: "50%", animation: "spin 0.7s linear infinite",
                }} />
                Generando...
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1v8M4 6l3 3 3-3M2 10v2a1 1 0 001 1h8a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Exportar PDF
              </>
            )}
          </button>
          <button onClick={() => router.push("/panel-admin/hallazgos/nuevo")} style={{
            background: "linear-gradient(135deg, #6366f1, #818cf8)", border: "none",
            borderRadius: 8, padding: "7px 16px", color: "#fff",
            fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
          }}>+ Nuevo hallazgo</button>
        </div>
      </nav>

      <main style={{ padding: "2rem", maxWidth: 1400, margin: "0 auto" }}>

        {/* Barra de filtros — ancho completo */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>

          <div style={{ position: "relative", zIndex: 30 }}>
            <button onClick={() => setPanelAbierto(prev => !prev)} style={{
              display: "flex", alignItems: "center", gap: "8px",
              background: panelAbierto || chipsActivos > 0 ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${panelAbierto || chipsActivos > 0 ? "rgba(99,102,241,0.35)" : "rgba(255,255,255,0.1)"}`,
              borderRadius: 8, padding: "7px 14px",
              color: panelAbierto || chipsActivos > 0 ? "#a5b4fc" : "#e8e8f0",
              fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 3h12M3 7h8M5 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Filtros
              {chipsActivos > 0 && (
                <span style={{
                  background: "#6366f1", borderRadius: 100, width: 18, height: 18,
                  fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
                }}>{chipsActivos}</span>
              )}
              <span style={{
                fontSize: 10, opacity: 0.6,
                transform: panelAbierto ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s", display: "inline-block",
              }}>▼</span>
            </button>

            {panelAbierto && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", left: 0,
                background: "rgba(13,13,20,0.98)", border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: 12, padding: "1.25rem 1.5rem",
                boxShadow: "0 16px 48px rgba(0,0,0,0.6)", zIndex: 30, minWidth: 420,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.1rem" }}>
                  <span style={{ fontSize: 11, color: "#6b6b94", textTransform: "uppercase", letterSpacing: "0.07em" }}>Filtros</span>
                  {chipsActivos > 0 && (
                    <button onClick={() => setFiltros(prev => ({ ...prev, severidades: new Set(), estados: new Set(), activo: "" }))}
                      style={{ background: "none", border: "none", color: "#6b6b94", fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
                      Limpiar
                    </button>
                  )}
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <p style={{ fontSize: 11, color: "#44445e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.6rem" }}>Severidad</p>
                  <div style={{ display: "flex", gap: "7px", flexWrap: "wrap" }}>
                    {SEVERIDADES.map(s => {
                      const on = filtros.severidades.has(s); const color = colorSeveridad[s];
                      return (
                        <button key={s} onClick={() => toggleSeveridad(s)} style={{
                          background: on ? `${color}22` : "rgba(255,255,255,0.03)",
                          border: `1px solid ${on ? color + "66" : "rgba(255,255,255,0.08)"}`,
                          borderRadius: 7, padding: "6px 14px", color: on ? color : "#6b6b94",
                          fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: on ? 600 : 400, transition: "all 0.15s",
                        }}>{emojiSeveridad[s]} {s}</button>
                      );
                    })}
                  </div>
                </div>
                <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginBottom: "1rem" }} />
                <div style={{ marginBottom: "1rem" }}>
                  <p style={{ fontSize: 11, color: "#44445e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.6rem" }}>Estado</p>
                  <div style={{ display: "flex", gap: "7px", flexWrap: "wrap" }}>
                    {ESTADOS.map(e => {
                      const on = filtros.estados.has(e); const color = colorEstado[e];
                      return (
                        <button key={e} onClick={() => toggleEstado(e)} style={{
                          background: on ? `${color}22` : "rgba(255,255,255,0.03)",
                          border: `1px solid ${on ? color + "66" : "rgba(255,255,255,0.08)"}`,
                          borderRadius: 7, padding: "6px 14px", color: on ? color : "#6b6b94",
                          fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: on ? 600 : 400, transition: "all 0.15s",
                        }}>{e}</button>
                      );
                    })}
                  </div>
                </div>
                <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginBottom: "1rem" }} />
                <div>
                  <p style={{ fontSize: 11, color: "#44445e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.6rem" }}>Activo</p>
                  <input placeholder="Buscar activo..." value={filtros.activo}
                    onChange={e => setFiltros(prev => ({ ...prev, activo: e.target.value }))}
                    style={{
                      width: "100%", boxSizing: "border-box",
                      background: filtros.activo ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${filtros.activo ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.08)"}`,
                      borderRadius: 8, padding: "7px 12px", color: "#e8e8f0", fontSize: 13, fontFamily: "inherit", outline: "none",
                    }} />
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: 12, color: "#44445e" }}>Desde</span>
            <input type="date" value={filtros.desde} onChange={e => setFiltros(prev => ({ ...prev, desde: e.target.value }))} style={dateInputStyle(!!filtros.desde)} />
            <span style={{ fontSize: 12, color: "#44445e" }}>Hasta</span>
            <input type="date" value={filtros.hasta} onChange={e => setFiltros(prev => ({ ...prev, hasta: e.target.value }))} style={dateInputStyle(!!filtros.hasta)} />
          </div>

          {totalActivos > 0 && (
            <button onClick={() => setFiltros(filtrosVacios())} style={{
              background: "none", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8, padding: "7px 12px", color: "#6b6b94",
              fontSize: 12, cursor: "pointer", fontFamily: "inherit",
            }}>Limpiar todo</button>
          )}
        </div>

        {/* Layout: tabla izquierda | gráficos derecha */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "1.5rem", alignItems: "start" }}>

          {/* ── Tabla ── */}
          <div style={{
            background: "rgba(15,15,22,0.85)", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 12, overflow: "hidden",
          }}>
            {hallazgosFiltrados.length === 0 ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "#44445e" }}>
                <p style={{ fontSize: 14 }}>No hay hallazgos que coincidan con los filtros.</p>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    {["Fecha", "Activo", "Tipo", "Severidad", "Estado", "Creado por", "Acciones"].map(h => (
                      <th key={h} style={{
                        padding: "12px 16px", textAlign: "left",
                        fontSize: 11, color: "#6b6b94", textTransform: "uppercase",
                        letterSpacing: "0.07em", fontWeight: 500,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hallazgosFiltrados.map((h, i) => (
                    <tr key={h.id} style={{
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                    }}>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "#9999bb" }}>{h.fecha}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 500 }}>{h.activo}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "#9999bb" }}>{h.tipo}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          background: `${colorSeveridad[h.severidad] || "#888"}22`,
                          border: `1px solid ${colorSeveridad[h.severidad] || "#888"}44`,
                          color: colorSeveridad[h.severidad] || "#888",
                          borderRadius: 100, padding: "3px 10px", fontSize: 12,
                        }}>{h.severidad}</span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          background: `${colorEstado[h.estado] || "#888"}22`,
                          border: `1px solid ${colorEstado[h.estado] || "#888"}44`,
                          color: colorEstado[h.estado] || "#888",
                          borderRadius: 100, padding: "3px 10px", fontSize: 12,
                        }}>{h.estado}</span>
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "#9999bb" }}>{h.nombreCreador}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button onClick={() => router.push(`/panel-admin/hallazgos/${h.id}`)} style={{
                            background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
                            borderRadius: 6, padding: "5px 12px", color: "#a5b4fc",
                            fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                          }}>Ver</button>
                          {(rol === "admin" || rol === "super-admin" || h.nombreCreador === nombre) && (
                            <button onClick={() => handleEliminar(h.id, h.activo)} disabled={eliminando === h.id} style={{
                              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                              borderRadius: 6, padding: "5px 12px", color: "#f87171",
                              fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                              opacity: eliminando === h.id ? 0.5 : 1,
                            }}>{eliminando === h.id ? "..." : "Eliminar"}</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Panel de gráficos (derecha) ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", position: "sticky", top: "76px" }}>

            {/* Donut Severidad */}
            <div style={{
              background: "rgba(15,15,22,0.85)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 12, padding: "1.25rem",
            }}>
              <DonutChart title="Hallazgos por Severidad" data={dataSeveridad} svgRef={svgSeveridadRef} />
            </div>

            {/* Donut Estado */}
            <div style={{
              background: "rgba(15,15,22,0.85)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 12, padding: "1.25rem",
            }}>
              <DonutChart title="Hallazgos por Estado" data={dataEstado} svgRef={svgEstadoRef} />
            </div>

            {/* Bar chart por día */}
            <div style={{
              background: "rgba(15,15,22,0.85)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 12, padding: "1.25rem",
            }}>
              <BarChart data={dataBarras} svgRef={svgBarRef} />
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
