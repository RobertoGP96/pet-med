import { CardsSkeleton, PageHeaderSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeaderSkeleton title="Vacunas" eyebrow="Medicina preventiva" />
      <CardsSkeleton />
    </div>
  );
}
