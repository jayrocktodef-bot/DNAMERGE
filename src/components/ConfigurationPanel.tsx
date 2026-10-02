import React from 'react';
import { Sliders, Download, Layers, ShieldCheck } from 'lucide-react';
import type { MergeOptions } from '../types/dna';

interface ConfigurationPanelProps {
  options: MergeOptions;
  onChangeOptions: (newOptions: MergeOptions) => void;
  onStartMerge: () => void;
  canMerge: boolean;
  isProcessing: boolean;
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  options,
  onChangeOptions,
  onStartMerge,
  canMerge,
  isProcessing,
}) => {
  return (
    <div className="rounded-2xl bg-zinc-950/80 border border-zinc-800 p-5 sm:p-6 shadow-xl backdrop-blur-md mb-6 sm:mb-8">
      <div className="flex items-center gap-2 mb-5 border-b border-zinc-800 pb-3.5">
        <Sliders className="w-5 h-5 text-amber-400" />
        <h2 className="text-base sm:text-lg font-semibold text-white">SuperKit Merge Configuration</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Primary Authority & Consensus Engine */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            Consensus & Conflict Arbitration
          </label>
          <p className="text-[11px] sm:text-xs text-zinc-400">
            How discordant or conflicting valid calls between platforms are resolved:
          </p>
          <div className="grid grid-cols-1 gap-2 pt-1">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => onChangeOptions({ ...options, primaryAuthority: 'weighted_consensus' })}
              className={`min-h-[48px] p-2.5 rounded-xl border text-xs font-medium transition-all flex items-start gap-2.5 text-left touch-manipulation active:scale-[0.98] ${
                options.primaryAuthority === 'weighted_consensus' || !options.primaryAuthority
                  ? 'bg-amber-500/20 border-amber-500/80 text-amber-200 shadow-md shadow-amber-500/10 font-bold'
                  : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div
                className={`w-3.5 h-3.5 mt-0.5 rounded-full border shrink-0 ${
                  options.primaryAuthority === 'weighted_consensus' || !options.primaryAuthority
                    ? 'bg-amber-500 border-amber-300'
                    : 'border-zinc-600'
                }`}
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span>Weighted Consensus</span>
                  <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold bg-amber-500/30 text-amber-300 rounded border border-amber-400/40">
                    RECOMMENDED
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 font-normal mt-0.5">
                  Bayesian platform weighting with chip dropout rescue (retains true heterozygotes)
                </p>
              </div>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => onChangeOptions({ ...options, primaryAuthority: 'kit1' })}
                className={`min-h-[40px] p-2 rounded-xl border text-xs font-medium transition-all flex items-center justify-center gap-2 touch-manipulation active:scale-[0.98] ${
                  options.primaryAuthority === 'kit1'
                    ? 'bg-amber-500/20 border-amber-500/80 text-amber-200 shadow-md font-bold'
                    : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full border shrink-0 ${
                    options.primaryAuthority === 'kit1' ? 'bg-amber-500 border-amber-300' : 'border-zinc-600'
                  }`}
                />
                <span>Kit 1 Priority</span>
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={() => onChangeOptions({ ...options, primaryAuthority: 'kit2' })}
                className={`min-h-[40px] p-2 rounded-xl border text-xs font-medium transition-all flex items-center justify-center gap-2 touch-manipulation active:scale-[0.98] ${
                  options.primaryAuthority === 'kit2'
                    ? 'bg-yellow-500/20 border-yellow-500/80 text-yellow-200 shadow-md font-bold'
                    : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full border shrink-0 ${
                    options.primaryAuthority === 'kit2' ? 'bg-yellow-500 border-yellow-300' : 'border-zinc-600'
                  }`}
                />
                <span>Kit 2 Priority</span>
              </button>
            </div>
          </div>
        </div>

        {/* Target Assembly / Build */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
            <Layers className="w-4 h-4 text-amber-400" />
            Target Reference Assembly
          </label>
          <p className="text-[11px] sm:text-xs text-zinc-400">
            Coordinate assembly used for output file alignment:
          </p>
          <div className="grid grid-cols-1 gap-2 pt-1">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => onChangeOptions({ ...options, targetBuild: 'GRCh37' })}
              className={`min-h-[48px] p-3 rounded-xl border text-xs font-medium transition-all flex items-center justify-between gap-2 touch-manipulation active:scale-[0.98] ${
                options.targetBuild === 'GRCh37' || !options.targetBuild
                  ? 'bg-amber-500/20 border-amber-500/80 text-amber-200 shadow-md shadow-amber-500/10 font-bold'
                  : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-3.5 h-3.5 rounded-full border shrink-0 ${
                    options.targetBuild === 'GRCh37' || !options.targetBuild ? 'bg-amber-500 border-amber-300' : 'border-zinc-600'
                  }`}
                />
                <span>GRCh37 / hg19</span>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono">Standard GEDmatch / FTDNA</span>
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={() => onChangeOptions({ ...options, targetBuild: 'GRCh38' })}
              className={`min-h-[48px] p-3 rounded-xl border text-xs font-medium transition-all flex items-center justify-between gap-2 touch-manipulation active:scale-[0.98] ${
                options.targetBuild === 'GRCh38'
                  ? 'bg-yellow-500/20 border-yellow-500/80 text-yellow-200 shadow-md shadow-yellow-500/10 font-bold'
                  : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-3.5 h-3.5 rounded-full border shrink-0 ${
                    options.targetBuild === 'GRCh38' ? 'bg-yellow-500 border-yellow-300' : 'border-zinc-600'
                  }`}
                />
                <span>GRCh38 / hg38</span>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono">Modern NCBI Standard</span>
            </button>

            {/* Per-Kit Source Build Selectors */}
            <div className="pt-2.5 border-t border-zinc-800/80 space-y-2 mt-1">
              <span className="text-[10px] font-mono uppercase text-zinc-400 font-semibold block">
                Source Kit Build Overrides
              </span>

              {/* Kit 1 Build */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-300 font-medium">Kit 1 Build:</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {(['auto', 'GRCh37', 'GRCh38'] as const).map((b) => {
                    const isSelected = (options.kit1BuildOverride || 'auto') === b;
                    return (
                      <button
                        key={b}
                        type="button"
                        disabled={isProcessing}
                        onClick={() => onChangeOptions({ ...options, kit1BuildOverride: b })}
                        className={`min-h-[32px] px-2 py-1 rounded-lg border text-[11px] font-mono font-medium transition-all ${
                          isSelected
                            ? 'bg-amber-500/25 border-amber-500/80 text-amber-200 font-bold'
                            : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        {b === 'auto' ? 'Auto-detect' : b}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Kit 2 Build */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-300 font-medium">Kit 2 Build:</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {(['auto', 'GRCh37', 'GRCh38'] as const).map((b) => {
                    const isSelected = (options.kit2BuildOverride || 'auto') === b;
                    return (
                      <button
                        key={b}
                        type="button"
                        disabled={isProcessing}
                        onClick={() => onChangeOptions({ ...options, kit2BuildOverride: b })}
                        className={`min-h-[32px] px-2 py-1 rounded-lg border text-[11px] font-mono font-medium transition-all ${
                          isSelected
                            ? 'bg-yellow-500/25 border-yellow-500/80 text-yellow-200 font-bold'
                            : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        {b === 'auto' ? 'Auto-detect' : b}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Export Format Configuration */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
            <Download className="w-4 h-4 text-amber-400" />
            Output SuperKit Schema
          </label>
          <p className="text-[11px] sm:text-xs text-zinc-400">
            Select destination file structure:
          </p>
          <div className="grid grid-cols-1 gap-2 pt-1">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => onChangeOptions({ ...options, outputFormat: 'ancestry' })}
              className={`min-h-[48px] p-3 rounded-xl border text-xs font-medium transition-all flex items-center justify-between gap-2 touch-manipulation active:scale-[0.98] ${
                options.outputFormat === 'ancestry'
                  ? 'bg-amber-500/20 border-amber-500/80 text-amber-200 shadow-md shadow-amber-500/10 font-bold'
                  : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-3.5 h-3.5 rounded-full border shrink-0 ${
                    options.outputFormat === 'ancestry' ? 'bg-amber-500 border-amber-300' : 'border-zinc-600'
                  }`}
                />
                <span>AncestryDNA (5-col)</span>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono">allele1 / allele2</span>
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={() => onChangeOptions({ ...options, outputFormat: '23andMe' })}
              className={`min-h-[48px] p-3 rounded-xl border text-xs font-medium transition-all flex items-center justify-between gap-2 touch-manipulation active:scale-[0.98] ${
                options.outputFormat === '23andMe'
                  ? 'bg-yellow-500/20 border-yellow-500/80 text-yellow-200 shadow-md shadow-yellow-500/10 font-bold'
                  : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-3.5 h-3.5 rounded-full border shrink-0 ${
                    options.outputFormat === '23andMe' ? 'bg-yellow-500 border-yellow-300' : 'border-zinc-600'
                  }`}
                />
                <span>23andMe (4-col)</span>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono">genotype call</span>
            </button>
          </div>
        </div>
      </div>

      {/* Start Merge Action */}
      <div className="pt-4 border-t border-zinc-800/80 flex justify-end">
        <button
          onClick={onStartMerge}
          disabled={!canMerge || isProcessing}
          className="group relative inline-flex items-center justify-center gap-3 px-8 py-3.5 min-h-[50px] rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold text-base shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed w-full md:w-auto touch-manipulation active:scale-[0.98]"
        >
          <Layers className="w-5 h-5 text-slate-950 group-hover:scale-110 transition-transform" />
          <span>{isProcessing ? 'Processing SuperKit...' : 'Generate SuperKit File'}</span>
        </button>
      </div>
    </div>
  );
};
