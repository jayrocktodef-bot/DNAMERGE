import React from 'react';
import {
  Compass,
  GitFork,
  TrendingUp,
  MapPin,
  Clock,
  ChevronRight,
  ShieldCheck,
  Search,
} from 'lucide-react';
import type { HaplogroupSummary, HaplogroupComparison } from '../types/haplogroup';

interface HaplogroupDashboardProps {
  kit1Haplogroups?: HaplogroupSummary;
  kit2Haplogroups?: HaplogroupSummary;
  superKitHaplogroups?: HaplogroupSummary;
  haplogroupComparison?: HaplogroupComparison;
  onOpenModal: () => void;
}

export const HaplogroupDashboard: React.FC<HaplogroupDashboardProps> = ({
  kit1Haplogroups,
  kit2Haplogroups,
  superKitHaplogroups,
  haplogroupComparison,
  onOpenModal,
}) => {
  if (!superKitHaplogroups) return null;

  const superY = superKitHaplogroups.yDna;
  const superMt = superKitHaplogroups.mtDna;

  const k1Y = kit1Haplogroups?.yDna;
  const k2Y = kit2Haplogroups?.yDna;

  const k1Mt = kit1Haplogroups?.mtDna;
  const k2Mt = kit2Haplogroups?.mtDna;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in mt-6 sm:mt-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-500/20 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <Compass className="w-4 h-4" />
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-wide">
              Haplogroup Resolution & Lineage Matrix
            </h3>
            <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase font-mono">
              Phylogeny
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Deep patrilineal (Y-DNA) and matrilineal (mtDNA) haplogroup classification derived from merged diagnostic loci.
          </p>
        </div>

        <button
          onClick={onOpenModal}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:text-amber-200 font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 touch-manipulation active:scale-95 shadow-sm"
        >
          <Search className="w-4 h-4 text-amber-400" />
          <span>Inspect Markers & Trees</span>
          <ChevronRight className="w-4 h-4 text-amber-400" />
        </button>
      </div>

      {/* Grid: Paternal (Y-DNA) and Maternal (mtDNA) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* ==================================================== */}
        {/* PATERNAL (Y-DNA) CARD */}
        {/* ==================================================== */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-950/40 via-zinc-950 to-black border border-amber-500/40 p-5 sm:p-6 shadow-xl backdrop-blur-md flex flex-col justify-between">
          <div className="space-y-4">
            {/* Card Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-amber-500/20 text-amber-400 font-mono text-[10px] font-bold uppercase tracking-wider px-2">
                  Y-DNA • Paternal Line
                </span>
                {superY && (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {superY.confidenceScore}% Confidence
                  </span>
                )}
              </div>
              <span className="text-[10px] text-zinc-400 font-mono">
                {superKitHaplogroups.yCount.toLocaleString()} Y-loci merged
              </span>
            </div>

            {/* Terminal Clade Display */}
            {superY ? (
              <div className="space-y-2">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 font-mono">
                    {superY.terminalHaplogroup.code}
                  </span>
                  <span className="text-sm font-semibold text-zinc-300 font-mono">
                    ({superY.terminalHaplogroup.shortName})
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                    Clade: {superY.terminalHaplogroup.cladeName}
                  </span>
                </div>

                {/* Resolution Upgrade Banner */}
                {haplogroupComparison?.paternalUpgradeText && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-semibold">
                    <TrendingUp className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{haplogroupComparison.paternalUpgradeText}</span>
                  </div>
                )}

                {/* Cross-Kit Comparison Matrix */}
                <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                  <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
                    <p className="text-[10px] uppercase font-bold text-zinc-400 font-mono">Kit 1</p>
                    <p className="text-sm font-bold text-zinc-200 font-mono mt-0.5 truncate">
                      {k1Y ? k1Y.terminalHaplogroup.code : 'No Y Data'}
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      {k1Y ? `${k1Y.positiveCount} positive` : 'Uncalled'}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
                    <p className="text-[10px] uppercase font-bold text-zinc-400 font-mono">Kit 2</p>
                    <p className="text-sm font-bold text-zinc-200 font-mono mt-0.5 truncate">
                      {k2Y ? k2Y.terminalHaplogroup.code : 'No Y Data'}
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      {k2Y ? `${k2Y.positiveCount} positive` : 'Uncalled'}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/50 shadow-inner">
                    <p className="text-[10px] uppercase font-bold text-amber-300 font-mono">SuperKit</p>
                    <p className="text-sm font-black text-amber-300 font-mono mt-0.5 truncate">
                      {superY.terminalHaplogroup.code}
                    </p>
                    <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                      {superY.positiveCount} confirmed
                    </p>
                  </div>
                </div>

                {/* Tree Hierarchy Path */}
                <div className="pt-2">
                  <p className="text-[10px] uppercase font-bold text-zinc-400 font-mono mb-1 flex items-center gap-1">
                    <GitFork className="w-3 h-3 text-amber-400" />
                    Lineage Branch Hierarchy:
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                    {superY.lineageTreePath.map((step, idx) => (
                      <React.Fragment key={step.code}>
                        <span
                          className={`px-2 py-0.5 rounded ${
                            idx === superY.lineageTreePath.length - 1
                              ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                              : 'bg-zinc-900 border border-zinc-800 text-zinc-300'
                          }`}
                        >
                          {step.shortName}
                        </span>
                        {idx < superY.lineageTreePath.length - 1 && (
                          <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Cultural Context Details */}
                <div className="grid grid-cols-2 gap-2 pt-3 text-xs border-t border-zinc-800/80">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] uppercase font-bold text-zinc-400">Origin Region</p>
                      <p className="text-zinc-200 font-medium">{superY.terminalHaplogroup.originRegion}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] uppercase font-bold text-zinc-400">Estimated Age</p>
                      <p className="text-zinc-200 font-medium">{superY.terminalHaplogroup.ageYearsBp}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <p className="text-zinc-400 text-sm">
                  {superKitHaplogroups.yCount === 0
                    ? 'No Chr Y markers present in sample (Female kit or uncalled).'
                    : 'Y-chromosome markers tested, but insufficient positive derived SNPs detected to assign branch.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ==================================================== */}
        {/* MATERNAL (mtDNA) CARD */}
        {/* ==================================================== */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950/30 via-zinc-950 to-black border border-emerald-500/40 p-5 sm:p-6 shadow-xl backdrop-blur-md flex flex-col justify-between">
          <div className="space-y-4">
            {/* Card Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-wider px-2">
                  mtDNA • Maternal Line
                </span>
                {superMt && (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {superMt.confidenceScore}% Confidence
                  </span>
                )}
              </div>
              <span className="text-[10px] text-zinc-400 font-mono">
                {superKitHaplogroups.mtCount.toLocaleString()} MT-loci merged
              </span>
            </div>

            {/* Terminal Clade Display */}
            {superMt ? (
              <div className="space-y-2">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-400 font-mono">
                    {superMt.terminalHaplogroup.code}
                  </span>
                  <span className="text-sm font-semibold text-zinc-300 font-mono">
                    ({superMt.terminalHaplogroup.shortName})
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                    PhyloTree Build 17
                  </span>
                </div>

                {/* Resolution Upgrade Banner */}
                {haplogroupComparison?.maternalUpgradeText && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                    <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{haplogroupComparison.maternalUpgradeText}</span>
                  </div>
                )}

                {/* Cross-Kit Comparison Matrix */}
                <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                  <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
                    <p className="text-[10px] uppercase font-bold text-zinc-400 font-mono">Kit 1</p>
                    <p className="text-sm font-bold text-zinc-200 font-mono mt-0.5 truncate">
                      {k1Mt ? k1Mt.terminalHaplogroup.code : 'No MT Data'}
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      {k1Mt ? `${k1Mt.positiveCount} positive` : 'Uncalled'}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
                    <p className="text-[10px] uppercase font-bold text-zinc-400 font-mono">Kit 2</p>
                    <p className="text-sm font-bold text-zinc-200 font-mono mt-0.5 truncate">
                      {k2Mt ? k2Mt.terminalHaplogroup.code : 'No MT Data'}
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      {k2Mt ? `${k2Mt.positiveCount} positive` : 'Uncalled'}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/50 shadow-inner">
                    <p className="text-[10px] uppercase font-bold text-emerald-300 font-mono">SuperKit</p>
                    <p className="text-sm font-black text-emerald-300 font-mono mt-0.5 truncate">
                      {superMt.terminalHaplogroup.code}
                    </p>
                    <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                      {superMt.positiveCount} confirmed
                    </p>
                  </div>
                </div>

                {/* Tree Hierarchy Path */}
                <div className="pt-2">
                  <p className="text-[10px] uppercase font-bold text-zinc-400 font-mono mb-1 flex items-center gap-1">
                    <GitFork className="w-3 h-3 text-emerald-400" />
                    Lineage Branch Hierarchy:
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                    {superMt.lineageTreePath.map((step, idx) => (
                      <React.Fragment key={step.code}>
                        <span
                          className={`px-2 py-0.5 rounded ${
                            idx === superMt.lineageTreePath.length - 1
                              ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                              : 'bg-zinc-900 border border-zinc-800 text-zinc-300'
                          }`}
                        >
                          {step.shortName}
                        </span>
                        {idx < superMt.lineageTreePath.length - 1 && (
                          <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Cultural Context Details */}
                <div className="grid grid-cols-2 gap-2 pt-3 text-xs border-t border-zinc-800/80">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] uppercase font-bold text-zinc-400">Origin Region</p>
                      <p className="text-zinc-200 font-medium">{superMt.terminalHaplogroup.originRegion}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] uppercase font-bold text-zinc-400">Estimated Age</p>
                      <p className="text-zinc-200 font-medium">{superMt.terminalHaplogroup.ageYearsBp}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <p className="text-zinc-400 text-sm">
                  Insufficient mitochondrial diagnostic markers detected in dataset.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
