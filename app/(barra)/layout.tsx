import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My App",
  description: "My App",
};

export default function BarraLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}