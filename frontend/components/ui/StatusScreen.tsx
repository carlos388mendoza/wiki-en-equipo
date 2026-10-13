import Link from "next/link";
import { FileQuestion, LogIn, ShieldAlert, TriangleAlert } from "lucide-react";
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
    Icon: LogIn,
    title: "Tu sesión terminó",
    body: "Vuelve a iniciar sesión para continuar.",
  },
  conflicto: {
    Icon: TriangleAlert,
    title: "Hubo cambios al mismo tiempo",
    body: "Alguien más modificó esto mientras lo veías. Recarga para ver la versión más reciente.",
  },
  datos_invalidos: {
    Icon: TriangleAlert,
    title: "No pudimos procesar la solicitud",
    body: "Revisa los datos e intenta de nuevo.",
  },
  archivo_rechazado: {
    Icon: TriangleAlert,
    title: "El archivo no se pudo subir",
    body: "Revisa el tamaño y el tipo de archivo.",
  },
  demasiados_intentos: {
    Icon: TriangleAlert,
    title: "Demasiados intentos",
    body: "Espera unos minutos e intenta de nuevo.",
  },
  error_servidor: {
    Icon: TriangleAlert,
    title: "No se pudo cargar",
    body: "El servidor no respondió. Revisa tu conexión e intenta de nuevo.",
  },
};

export function StatusScreen({ error, title, message, action }: {
  error: ApiError; title?: string; message?: string; action?: React.ReactNode;
}) {
  const { Icon, ...text } = content[error];
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-start gap-3 px-6 py-24">
      <Icon size={32} className={error === "error_servidor" ? "text-danger" : "text-muted"} aria-hidden />
      <h1 className="font-display text-2xl font-semibold">{title ?? text.title}</h1>
      <p className="text-muted">{message ?? text.body}</p>
      {action ?? (
        error === "no_autenticado" ? (
          <Link href="/login" className="mt-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-basil">
            Iniciar sesión
          </Link>
        ) : (
          <Link href="/" className="mt-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-basil">
            Ir al inicio
          </Link>
        )
      )}
    </div>
  );
}
