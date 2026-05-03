// panel-admin/hallazgos/nuevo/page.tsx → solo 4 líneas
"use client";
import HallazgoForm from "@/components/hallazgos/hallazgo-form";

export default function NuevoHallazgoAdmin() {
  return <HallazgoForm redirectUrl="/panel-admin/hallazgos" />;
}