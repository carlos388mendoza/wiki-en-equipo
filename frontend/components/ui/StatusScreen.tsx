import Link from "next/link";
import { FileQuestion, ShieldAlert, TriangleAlert } from "lucide-react";
import type { ApiError } from "@/lib/types";

const content: Record<ApiError, { Icon: typeof ShieldAlert; title: string; body: string }> = {
  sin_acceso: {
    Icon: ShieldAlert,
    title: "No tienes acceso a esta página",
    body: "Es privada o pertenece a otro departamento. Pide a quien la creó que la comparta contigo.",
  },
  no_encontrada: {
    Icon: FileQuestion,
    title: "Esta página no existe",
    body: "Puede que la hayan movido a la papelera o que el enlace esté incompleto.",
  },
  no_autenticado: {
    Icon: ShieldAlert,
    title: "Tu sesión terminó",
    body: "Vuelve a iniciar sesión para continuar.",
  },
  error_servidor: {
    Icon: TriangleAlert,
    title: "No se pudo cargar",
    body: "El servidor no respondió. Revisa tu conexión e intenta de nuevo.",
  },
};

export function StatusScreen({ error, action }: { error: ApiError; action?: React.ReactNode }) {
  const { Icon, title, body } = content[error];
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-start gap-3 px-6 py-24">
      <Icon size={32} className={error === "error_servidor" ? "text-danger" : "text-muted"} aria-hidden />
      <h1 className="font-display text-2xl font-semibold">{title}</h1>
      <p className="text-muted">{body}</p>
      {action ?? (
        <Link href="/" className="mt-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-basil">
          Ir al inicio
        </Link>
      )}
    </div>
  );
}
