import { CardsSkeleton, PageHeaderSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeaderSkeleton title="Fotos" eyebrow="Álbum" />
      <CardsSkeleton height="h-56" />
    </div>
  );
}
