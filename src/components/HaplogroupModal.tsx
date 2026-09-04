import React, { useState } from 'react';
import {
  X,
  Compass,
  GitFork,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Zap,
  Layers,
  ChevronRight,
} from 'lucide-react';
import type { HaplogroupSummary, HaplogroupComparison, EvaluatedMarker } from '../types/haplogroup';

interface HaplogroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  kit1Haplogroups?: HaplogroupSummary;
  kit2Haplogroups?: HaplogroupSummary;
  superKitHaplogroups?: HaplogroupSummary;
  haplogroupComparison?: HaplogroupComparison;
}

export const HaplogroupModal: React.FC<HaplogroupModalProps> = ({
  isOpen,
  onClose,
  kit1Haplogroups,
  kit2Haplogroups,
  superKitHaplogroups,
  haplogroupComparison,
}) => {
  const [activeTab, setActiveTab] = useState<'paternal' | 'maternal' | 'synergy'>('paternal');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'POSITIVE_DERIVED' | 'NEGATIVE_ANCESTRAL' | 'NO_CALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen || !superKitHaplogroups) return null;

  const superY = superKitHaplogroups.yDna;
  const superMt = superKitHaplogroups.mtDna;

  const markers: EvaluatedMarker[] = haplogroupComparison?.evaluatedMarkers || [];

  // Filter markers based on active tab, status, and search query
  const displayedMarkers = markers.filter((m) => {
    if (activeTab === 'paternal' && m.snp.lineageType !== 'PATERNAL_YDNA') return false;
    if (activeTab === 'maternal' && m.snp.lineageType !== 'MATERNAL_MTDNA') return false;

    if (statusFilter !== 'ALL' && m.status !== statusFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = m.snp.name.toLowerCase().includes(q);
      const matchRsid = m.snp.rsid.toLowerCase().includes(q);
      const matchHaplo = m.snp.haplogroup.toLowerCase().includes(q);
      const matchDesc = m.snp.description.toLowerCase().includes(q);
      if (!matchName && !matchRsid && !matchHaplo && !matchDesc) return false;
    }

    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl bg-zinc-950 border border-amber-500/40 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-zinc-800 bg-gradient-to-r from-amber-950/40 via-zinc-950 to-zinc-950">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <Compass className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                Haplogroup Resolution & Marker Audit
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                  Phylogeny Engine
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Audited diagnostic loci across Kit 1, Kit 2, and the merged SuperKit assembly.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-4 sm:px-6 pt-4 border-b border-zinc-800 bg-zinc-900/50">
          <button
            onClick={() => { setActiveTab('paternal'); setStatusFilter('ALL'); }}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'paternal'
                ? 'border-amber-500 text-amber-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <GitFork className="w-4 h-4" />
            <span>Paternal Y-DNA ({superY ? superY.terminalHaplogroup.code : 'None'})</span>
          </button>

          <button
            onClick={() => { setActiveTab('maternal'); setStatusFilter('ALL'); }}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'maternal'
                ? 'border-emerald-500 text-emerald-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Maternal mtDNA ({superMt ? superMt.terminalHaplogroup.code : 'None'})</span>
          </button>

          <button
            onClick={() => { setActiveTab('synergy'); }}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'synergy'
                ? 'border-yellow-500 text-yellow-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Cross-Kit Synergy & Gap-Filling</span>
          </button>
        </div>

        {/* Modal Body Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1 & TAB 2: PATERNAL OR MATERNAL LINEAGE */}
          {(activeTab === 'paternal' || activeTab === 'maternal') && (
            <>
              {/* Clade Path & Cultural Summary Card */}
              {activeTab === 'paternal' && superY && (
                <div className="p-4 sm:p-5 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono">
                      Terminal Subclade: {superY.terminalHaplogroup.code} ({superY.terminalHaplogroup.shortName})
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">
                      Confidence: {superY.confidenceScore}%
                    </span>
                  </div>

                  {/* Phylogenetic Steps */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                    {superY.lineageTreePath.map((step, idx) => (
                      <React.Fragment key={step.code}>
                        <span
                          className={`px-2 py-0.5 rounded ${
                            idx === superY.lineageTreePath.length - 1
                              ? 'bg-amber-500 text-slate-950 font-bold'
                              : 'bg-zinc-900 border border-zinc-700 text-zinc-300'
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

                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {superY.terminalHaplogroup.historicalDescription}
                  </p>
                </div>
              )}

              {activeTab === 'maternal' && superMt && (
                <div className="p-4 sm:p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
                      Terminal Subclade: {superMt.terminalHaplogroup.code} ({superMt.terminalHaplogroup.shortName})
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                      Confidence: {superMt.confidenceScore}%
                    </span>
                  </div>

                  {/* Phylogenetic Steps */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                    {superMt.lineageTreePath.map((step, idx) => (
                      <React.Fragment key={step.code}>
                        <span
                          className={`px-2 py-0.5 rounded ${
                            idx === superMt.lineageTreePath.length - 1
                              ? 'bg-emerald-500 text-slate-950 font-bold'
                              : 'bg-zinc-900 border border-zinc-700 text-zinc-300'
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

                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {superMt.terminalHaplogroup.historicalDescription}
                  </p>
                </div>
              )}

              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    onClick={() => setStatusFilter('ALL')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      statusFilter === 'ALL'
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    All Markers ({activeTab === 'paternal' ? markers.filter(m => m.snp.lineageType === 'PATERNAL_YDNA').length : markers.filter(m => m.snp.lineageType === 'MATERNAL_MTDNA').length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('POSITIVE_DERIVED')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      statusFilter === 'POSITIVE_DERIVED'
                        ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Positive Derived
                  </button>
                  <button
                    onClick={() => setStatusFilter('NEGATIVE_ANCESTRAL')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      statusFilter === 'NEGATIVE_ANCESTRAL'
                        ? 'bg-zinc-700 text-zinc-200'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Ancestral (Unmutated)
                  </button>
                  <button
                    onClick={() => setStatusFilter('NO_CALL')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      statusFilter === 'NO_CALL'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Uncalled
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Search marker, rsID, or clade..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-amber-500/50 sm:w-64"
                />
              </div>

              {/* Marker Table */}
              <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950/60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/90 text-zinc-400 font-mono uppercase text-[10px] tracking-wider border-b border-zinc-800">
                    <tr>
                      <th className="p-3">Marker</th>
                      <th className="p-3">Coordinate</th>
                      <th className="p-3">Derived / Anc</th>
                      <th className="p-3 text-center">Kit 1</th>
                      <th className="p-3 text-center">Kit 2</th>
                      <th className="p-3 text-center">SuperKit</th>
                      <th className="p-3">Evaluation</th>
                      <th className="p-3">Clade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono">
                    {displayedMarkers.map((m, idx) => {
                      const isPositive = m.status === 'POSITIVE_DERIVED';
                      const isAncestral = m.status === 'NEGATIVE_ANCESTRAL';
                      const isNoCall = m.status === 'NO_CALL';

                      return (
                        <tr
                          key={idx}
                          className={`hover:bg-zinc-900/40 transition-colors ${
                            isPositive ? 'bg-emerald-950/15' : ''
                          }`}
                        >
                          <td className="p-3 font-bold text-white">
                            {m.snp.name}
                            <span className="block text-[10px] text-zinc-400 font-normal">
                              {m.snp.rsid}
                            </span>
                          </td>
                          <td className="p-3 text-zinc-300">
                            {m.snp.chromosome}:{m.snp.position.toLocaleString()}
                          </td>
                          <td className="p-3">
                            <span className="text-emerald-400 font-bold">{m.snp.derivedAllele}</span>
                            <span className="text-zinc-400 mx-1">/</span>
                            <span className="text-zinc-400">{m.snp.ancestralAllele}</span>
                          </td>
                          <td className="p-3 text-center font-bold text-zinc-300">
                            {m.kit1Genotype || '--'}
                          </td>
                          <td className="p-3 text-center font-bold text-zinc-300">
                            {m.kit2Genotype || '--'}
                          </td>
                          <td className="p-3 text-center font-black text-amber-300">
                            {m.superKitGenotype}
                          </td>
                          <td className="p-3">
                            {isPositive && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                <CheckCircle2 className="w-3 h-3" /> Positive Derived
                              </span>
                            )}
                            {isAncestral && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-300">
                                Ancestral
                              </span>
                            )}
                            {isNoCall && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                No-Call
                              </span>
                            )}
                            {!isPositive && !isAncestral && !isNoCall && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300">
                                <AlertCircle className="w-3 h-3" /> Mismatch
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-zinc-300 font-semibold truncate max-w-[120px]">
                            {m.snp.haplogroup}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* TAB 3: CROSS-KIT SYNERGY & GAP-FILLING */}
          {activeTab === 'synergy' && (
            <div className="space-y-6 animate-fade-in">
              {/* Stat Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 to-black border border-amber-500/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase text-amber-400 font-mono">
                      Y-DNA Synergy
                    </span>
                    <Zap className="w-4 h-4 text-amber-400" />
                  </div>
                  <p className="text-2xl font-black text-white font-mono">
                    {haplogroupComparison?.yDnaSynergyCount || 0}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Y-markers uncalled in one kit, recovered in SuperKit
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-black border border-emerald-500/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase text-emerald-400 font-mono">
                      mtDNA Synergy
                    </span>
                    <Zap className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-2xl font-black text-white font-mono">
                    {haplogroupComparison?.mtDnaSynergyCount || 0}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    mtDNA markers uncalled in one kit, recovered in SuperKit
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-gradient-to-br from-yellow-950/40 to-black border border-yellow-500/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase text-yellow-400 font-mono">
                      Subclade Depth Gain
                    </span>
                    <TrendingUp className="w-4 h-4 text-yellow-400" />
                  </div>
                  <p className="text-2xl font-black text-white font-mono">
                    +{(haplogroupComparison?.paternalCladesGained || 0) + (haplogroupComparison?.maternalCladesGained || 0)}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Total phylogenetic branch tiers elevated
                  </p>
                </div>
              </div>

              {/* Kit 1 vs Kit 2 vs SuperKit Breakdown Table */}
              <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono">
                  Lineage Classification by Dataset
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                    <span className="text-[11px] font-bold uppercase text-zinc-400 font-mono">
                      Patrilineal (Y-DNA)
                    </span>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-zinc-300">
                        <span className="text-zinc-400">Kit 1:</span>
                        <span className="font-mono font-semibold">{kit1Haplogroups?.yDna ? kit1Haplogroups.yDna.terminalHaplogroup.code : 'No-call / Unassigned'}</span>
                      </div>
                      <div className="flex justify-between text-zinc-300">
                        <span className="text-zinc-400">Kit 2:</span>
                        <span className="font-mono font-semibold">{kit2Haplogroups?.yDna ? kit2Haplogroups.yDna.terminalHaplogroup.code : 'No-call / Unassigned'}</span>
                      </div>
                      <div className="flex justify-between text-amber-300 pt-1 border-t border-zinc-800 font-bold">
                        <span>SuperKit:</span>
                        <span className="font-mono">{superKitHaplogroups?.yDna ? superKitHaplogroups.yDna.terminalHaplogroup.code : 'No-call'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                    <span className="text-[11px] font-bold uppercase text-zinc-400 font-mono">
                      Matrilineal (mtDNA)
                    </span>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-zinc-300">
                        <span className="text-zinc-400">Kit 1:</span>
                        <span className="font-mono font-semibold">{kit1Haplogroups?.mtDna ? kit1Haplogroups.mtDna.terminalHaplogroup.code : 'No-call / Unassigned'}</span>
                      </div>
                      <div className="flex justify-between text-zinc-300">
                        <span className="text-zinc-400">Kit 2:</span>
                        <span className="font-mono font-semibold">{kit2Haplogroups?.mtDna ? kit2Haplogroups.mtDna.terminalHaplogroup.code : 'No-call / Unassigned'}</span>
                      </div>
                      <div className="flex justify-between text-emerald-300 pt-1 border-t border-zinc-800 font-bold">
                        <span>SuperKit:</span>
                        <span className="font-mono">{superKitHaplogroups?.mtDna ? superKitHaplogroups.mtDna.terminalHaplogroup.code : 'No-call'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Explanatory Narrative */}
              <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  Why Merging Kits Elevates Haplogroup Resolution
                </h4>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Commercial DTC genetic testing arrays (such as AncestryDNA's Illumina OmniExpress and 23andMe's Custom Global Screening Array) test different sets of Y-chromosome and mitochondrial SNPs. When you test with only one company, key branching markers further down the tree may be missing or uncalled, stopping classification at an ancestral macroclade (e.g. <em>R-M269</em> instead of <em>R-U152</em>, or <em>H</em> instead of <em>H1</em>).
                </p>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  By merging both raw files into a single unified SuperKit, the complementary markers from both platforms are synthesized into a cohesive genome. This gap-filling allows the tree traversal algorithm to test downstream terminal subclades with higher diagnostic confidence.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-zinc-800 bg-zinc-950 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
