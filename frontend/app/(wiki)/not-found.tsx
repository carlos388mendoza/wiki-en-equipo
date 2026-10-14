import { StatusScreen } from "@/components/ui/StatusScreen";

export const metadata = { title: "Página no encontrada" };

export default function NotFound() {
  return <StatusScreen error="no_encontrada" />;
}
