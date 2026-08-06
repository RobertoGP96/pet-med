import { ListSkeleton, PageHeaderSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeaderSkeleton title="Mis mascotas" />
      <ListSkeleton />
    </div>
  );
}
