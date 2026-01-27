interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 h-full flex flex-col">
      <div className="relative h-32 w-full bg-gray-200 animate-pulse" />
      <div className="p-3 flex-1 flex flex-col gap-2">
        <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
        <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
        <div className="flex justify-between items-center mt-auto pt-2">
          <div className="h-5 bg-gray-200 rounded w-1/3 animate-pulse" />
          <div className="h-8 w-8 bg-gray-200 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
}
