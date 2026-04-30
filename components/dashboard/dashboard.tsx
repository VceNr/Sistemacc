import { useAuth } from "@/lib/auth-context";

export default function Dashboard() {
  const { user, loading } = useAuth();

  if (loading) return <p>Cargando...</p>;

  return <h1>Hola, {user?.displayName}</h1>;
}