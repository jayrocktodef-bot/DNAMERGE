import React from 'react';
import {
  Download,
  Eye,
  CheckCircle2,
  GitMerge,
  Zap,
  Split,
  PlusCircle,
  Clock,
  Sparkles,
  RotateCcw,
  Film,
  Compass,
} from 'lucide-react';
import type { WorkerSuccessMessage } from '../types/dna';
import { HaplogroupDashboard } from './HaplogroupDashboard';

interface SummaryDashboardProps {
  result: WorkerSuccessMessage;
  onDownload: () => void;
  onOpenPreview: () => void;
  onOpenVideo: () => void;
  onOpenHaplogroups: () => void;
  onReset: () => void;
}

export const SummaryDashboard: React.FC<SummaryDashboardProps> = ({
  result,
  onDownload,
  onOpenPreview,
  onOpenVideo,
  onOpenHaplogroups,
  onReset,
}) => {
  const statCards = [
    {
      title: 'Total SuperKit Loci',
      value: result.totalSuperKitCount.toLocaleString(),
      subtitle: 'Final deduplicated & sorted SNPs',
      icon: Sparkles,
      color: 'from-amber-600 to-yellow-600',
      textColor: 'text-amber-300',
      borderColor: 'border-amber-500/50',
      highlight: true,
    },
    {
      title: 'Kit 1 Total SNPs',
      value: result.totalKit1Count.toLocaleString(),
      subtitle: `${result.uniqueKit1Count.toLocaleString()} unique to Kit 1`,
      icon: CheckCircle2,
      color: 'from-amber-950/40 to-black',
      textColor: 'text-amber-400',
      borderColor: 'border-amber-500/30',
    },
    {
      title: 'Kit 2 Total SNPs',
      value: result.totalKit2Count.toLocaleString(),
      subtitle: `${result.uniqueKit2Count.toLocaleString()} unique to Kit 2`,
      icon: CheckCircle2,
      color: 'from-yellow-950/40 to-black',
      textColor: 'text-yellow-400',
      borderColor: 'border-yellow-500/30',
    },
    {
      title: 'Overlapping Loci',
      value: result.overlappingCount.toLocaleString(),
      subtitle: 'Shared coordinates in both kits',
      icon: GitMerge,
      color: 'from-amber-950/40 to-black',
      textColor: 'text-amber-400',
      borderColor: 'border-amber-500/30',
    },
    {
      title: 'Gap-Filled SNPs',
      value: result.gapFilledCount.toLocaleString(),
      subtitle: 'No-calls (00) replaced by valid calls',
      icon: Zap,
      color: 'from-emerald-950/40 to-black',
      textColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/30',
    },
    {
      title: 'Discordant Calls Resolved',
      value: result.discordantCount.toLocaleString(),
      subtitle: 'Conflicting calls resolved by Authority',
      icon: Split,
      color: 'from-orange-950/40 to-black',
      textColor: 'text-orange-400',
      borderColor: 'border-orange-500/30',
    },
    {
      title: 'Unique SNPs Added',
      value: (result.uniqueKit1Count + result.uniqueKit2Count).toLocaleString(),
      subtitle: 'Non-overlapping loci combined',
      icon: PlusCircle,
      color: 'from-yellow-950/40 to-black',
      textColor: 'text-yellow-400',
      borderColor: 'border-yellow-500/30',
    },
    {
      title: 'Processing Time',
      value: `${(result.executionTimeMs / 1000).toFixed(2)}s`,
      subtitle: 'Web Worker execution duration',
      icon: Clock,
      color: 'from-zinc-950 to-black',
      textColor: 'text-zinc-400',
      borderColor: 'border-zinc-800',
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in mb-6 sm:mb-8">
      {/* Top Banner with Download & Action Triggers */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950 via-zinc-950 to-yellow-950 border border-amber-500/40 p-5 sm:p-6 md:p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                SUCCESS
              </span>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white">SuperKit Ready for Download</h2>
            </div>
            <p className="text-xs sm:text-sm text-zinc-300">
              Merged <span className="font-semibold text-white">{result.totalSuperKitCount.toLocaleString()}</span> loci into{' '}
              <span className="font-semibold text-amber-400 uppercase font-mono">{result.outputFormat}</span> schema format.
            </p>
          </div>

          {/* Action buttons stack on mobile, flex row on desktop */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <button
              onClick={onReset}
              className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white font-medium text-xs transition-all flex items-center justify-center gap-1.5 touch-manipulation active:scale-95"
              title="Reset datasets"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>

            <button
              onClick={onOpenVideo}
              className="min-h-[48px] px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 touch-manipulation active:scale-95"
              title="Play Ethereal Concept Video"
            >
              <Film className="w-4 h-4 text-amber-400" />
              <span>Play Video</span>
            </button>

            <button
              onClick={onOpenHaplogroups}
              className="min-h-[48px] px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 hover:text-amber-200 font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 touch-manipulation active:scale-95"
              title="Inspect Haplogroup Resolution"
            >
              <Compass className="w-4 h-4 text-amber-400" />
              <span>Haplogroups</span>
            </button>

            <button
              onClick={onOpenPreview}
              className="min-h-[48px] px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-2 touch-manipulation active:scale-95"
            >
              <Eye className="w-4 h-4 text-zinc-400" />
              <span>Preview</span>
            </button>

            <button
              onClick={onDownload}
              className="col-span-2 sm:col-span-1 min-h-[48px] px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/30 transition-all flex items-center justify-center gap-2 touch-manipulation active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Download (.txt)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Statistics Cards (2 cols on mobile, 4 on desktop) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all duration-300 bg-gradient-to-br ${
                card.color
              } ${card.borderColor} shadow-lg backdrop-blur-md ${
                card.highlight ? 'ring-2 ring-amber-500/60' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="text-[10px] sm:text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono truncate">
                  {card.title}
                </span>
                <div className={`p-1.5 sm:p-2 rounded-xl bg-black/70 border ${card.borderColor} shrink-0`}>
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${card.textColor}`} />
                </div>
              </div>
              <p className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white font-mono">{card.value}</p>
              <p className="text-[10px] sm:text-xs text-zinc-400 mt-1 truncate">{card.subtitle}</p>
            </div>
          );
        })}
      </div>

      {/* Haplogroup Resolution & Lineage Matrix */}
      {result.superKitHaplogroups && (
        <HaplogroupDashboard
          kit1Haplogroups={result.kit1Haplogroups}
          kit2Haplogroups={result.kit2Haplogroups}
          superKitHaplogroups={result.superKitHaplogroups}
          haplogroupComparison={result.haplogroupComparison}
          onOpenModal={onOpenHaplogroups}
        />
      )}
    </div>
  );
};
