import { ListSkeleton } from "@/components/ui/skeleton";

/** La cabecera y las pestañas del panel vienen de `admin/layout.tsx`. */
export default function Loading() {
  return <ListSkeleton rows={5} />;
}
