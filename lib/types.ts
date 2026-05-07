export type Severidad = "Crítica" | "Alta" | "Media" | "Baja";
export type Estado    = "Nuevo" | "En análisis" | "En remediación" | "Mitigado" | "Cerrado";

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
