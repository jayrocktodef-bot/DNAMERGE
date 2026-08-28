import React from 'react';
import { BarChart3 } from 'lucide-react';
import type { ChromosomeCount } from '../types/dna';

interface ChromosomeDistributionChartProps {
  distribution: ChromosomeCount[];
}

export const ChromosomeDistributionChart: React.FC<ChromosomeDistributionChartProps> = ({
  distribution,
}) => {
  if (!distribution || distribution.length === 0) return null;

  const maxCount = Math.max(...distribution.map((d) => d.count), 1);

  return (
    <div className="rounded-2xl bg-zinc-950/80 border border-zinc-800 p-5 sm:p-6 shadow-xl backdrop-blur-md mb-8">
      <div className="flex items-center justify-between mb-4 sm:mb-6 border-b border-zinc-800 pb-3.5">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-amber-400" />
          <h2 className="text-base sm:text-lg font-semibold text-white">Genomic Coverage & Chromosome Breakdown</h2>
        </div>
        <span className="text-xs text-amber-400/80 font-mono hidden sm:inline">
          {distribution.length} Chromosomes Mapped
        </span>
      </div>

      {/* Horizontal Scroll Container for Mobile Devices */}
      <div className="relative w-full overflow-x-auto pb-2 -mx-2 px-2 sm:mx-0 sm:px-0">
        <div className="flex sm:grid sm:grid-cols-6 lg:grid-cols-13 gap-2 min-w-max sm:min-w-0">
          {distribution.map((item) => {
            const heightPercent = Math.max(10, Math.round((item.count / maxCount) * 100));

            return (
              <div
                key={item.chr}
                className="flex flex-col items-center gap-2 group p-2 w-14 sm:w-auto rounded-xl hover:bg-zinc-900/60 transition-colors shrink-0"
              >
                {/* Count tooltip on hover */}
                <span className="text-[10px] font-mono text-amber-300 opacity-80 group-hover:opacity-100 transition-opacity">
                  {item.count.toLocaleString()}
                </span>

                {/* Bar container */}
                <div className="w-full h-28 sm:h-32 bg-black rounded-lg p-1 border border-zinc-800 flex items-end justify-center">
                  <div
                    className="w-full bg-gradient-to-t from-amber-600 via-yellow-500 to-amber-400 rounded-md transition-all duration-500 ease-out group-hover:brightness-125 shadow-sm shadow-amber-500/30"
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>

                {/* Label */}
                <span className="text-xs font-bold text-zinc-300 font-mono">
                  {item.chr === 'MT' ? 'MT' : item.chr}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
