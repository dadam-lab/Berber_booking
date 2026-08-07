import React from 'react';

/**
 * Skeleton loader pro sekci služeb v rezervačním widgetu.
 */
export function ServicesSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 w-40 bg-zinc-800 rounded-md"></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800/80 space-y-3"
          >
            <div className="flex justify-between items-center">
              <div className="h-5 w-32 bg-zinc-800 rounded"></div>
              <div className="h-5 w-16 bg-amber-500/20 rounded"></div>
            </div>
            <div className="h-3 w-4/5 bg-zinc-800/60 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton loader pro fotogalerii střihů (3-sloupcový grid).
 */
export function GallerySkeleton() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-zinc-800/60">
      <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
        <div className="h-8 w-48 bg-zinc-800 rounded-lg mx-auto animate-pulse"></div>
        <div className="h-4 w-72 bg-zinc-800/50 rounded mx-auto animate-pulse"></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {[1, 2, 3, 4, 5, 6].map((idx) => (
          <div
            key={idx}
            className="rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900/60 animate-pulse"
          >
            <div className="aspect-[4/3] w-full bg-zinc-800/80"></div>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Skeleton loader pro obecné sekce.
 */
export function GeneralSectionSkeleton() {
  return (
    <div className="p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 animate-pulse space-y-4">
      <div className="h-7 w-1/3 bg-zinc-800 rounded"></div>
      <div className="h-4 w-full bg-zinc-800/60 rounded"></div>
      <div className="h-4 w-5/6 bg-zinc-800/60 rounded"></div>
    </div>
  );
}
