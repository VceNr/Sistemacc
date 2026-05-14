export type Severidad = "Crítica" | "Alta" | "Media" | "Baja";
export type Estado    = "Nuevo" | "En análisis" | "En remediación" | "Mitigado" | "Cerrado";

export const colorSeveridad: Record<Severidad, string> = {
  "Crítica": "#ef4444",
  "Alta":    "#f97316",
  "Media":   "#eab308",
  "Baja":    "#22c55e",
};

export const colorEstado: Record<Estado, string> = {
  "Nuevo":          "#6366f1",
  "En análisis":    "#3b82f6",
  "En remediación": "#f59e0b",
  "Mitigado":       "#10b981",
  "Cerrado":        "#6b7280",
};

export interface Hallazgo {
  id:                string;
  fecha:             string;
  activo:            string;
  tipo:              string;
  severidad:         Severidad;
  estado:            Estado;
  descripcion:       string;
  evidencia:         string;
  imagenesEvidencia: string[];
  recomendacion:     string;
  nombreCreador:     string;
  creadoPor:         string;
  rolCreador:        string;
  creadoEn:          any;
  actualizadoEn:     any;
}

export interface HistorialItem {
  id:            string;
  campo:         string;
  valorAnterior: string;
  valorNuevo:    string;
  modificadoPor: string;
  fecha:         any;
}

export interface LogAuditoria {
  id:        string;
  usuario:   string;
  accion:    string;
  detalle:   string;
  timestamp: any;
}

export interface CreateHallazgoData {
  fecha:         string;
  activo:        string;
  tipo:          string;
  severidad:     Severidad;
  descripcion:   string;
  evidencia:     string;
  recomendacion: string;
  creadoPor:     string;
  nombreCreador: string;
  rolCreador:    string;
}
