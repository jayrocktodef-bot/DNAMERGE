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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Primary Authority Configuration */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            Primary Authority (Discordant Calls)
          </label>
          <p className="text-[11px] sm:text-xs text-zinc-400">
            If both files contain conflicting valid calls for the same locus, default to this kit:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => onChangeOptions({ ...options, primaryAuthority: 'kit1' })}
              className={`min-h-[48px] p-3 rounded-xl border text-xs font-medium transition-all flex items-center justify-center gap-2 touch-manipulation active:scale-[0.98] ${
                options.primaryAuthority === 'kit1'
                  ? 'bg-amber-500/20 border-amber-500/80 text-amber-200 shadow-md shadow-amber-500/10 font-bold'
                  : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full border shrink-0 ${
                  options.primaryAuthority === 'kit1' ? 'bg-amber-500 border-amber-300' : 'border-zinc-600'
                }`}
              />
              <span>Kit 1 Authority</span>
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={() => onChangeOptions({ ...options, primaryAuthority: 'kit2' })}
              className={`min-h-[48px] p-3 rounded-xl border text-xs font-medium transition-all flex items-center justify-center gap-2 touch-manipulation active:scale-[0.98] ${
                options.primaryAuthority === 'kit2'
                  ? 'bg-yellow-500/20 border-yellow-500/80 text-yellow-200 shadow-md shadow-yellow-500/10 font-bold'
                  : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full border shrink-0 ${
                  options.primaryAuthority === 'kit2' ? 'bg-yellow-500 border-yellow-300' : 'border-zinc-600'
                }`}
              />
              <span>Kit 2 Authority</span>
            </button>
          </div>
        </div>

        {/* Export Format Configuration */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
            <Download className="w-4 h-4 text-amber-400" />
            Output SuperKit Schema
          </label>
          <p className="text-[11px] sm:text-xs text-zinc-400">
            Select destination raw data format for maximum compatibility with third-party tools:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => onChangeOptions({ ...options, outputFormat: 'ancestry' })}
              className={`min-h-[48px] p-3 rounded-xl border text-xs font-medium transition-all flex items-center justify-center gap-2 touch-manipulation active:scale-[0.98] ${
                options.outputFormat === 'ancestry'
                  ? 'bg-amber-500/20 border-amber-500/80 text-amber-200 shadow-md shadow-amber-500/10 font-bold'
                  : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full border shrink-0 ${
                  options.outputFormat === 'ancestry' ? 'bg-amber-500 border-amber-300' : 'border-zinc-600'
                }`}
              />
              <span>AncestryDNA (5-col)</span>
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={() => onChangeOptions({ ...options, outputFormat: '23andMe' })}
              className={`min-h-[48px] p-3 rounded-xl border text-xs font-medium transition-all flex items-center justify-center gap-2 touch-manipulation active:scale-[0.98] ${
                options.outputFormat === '23andMe'
                  ? 'bg-yellow-500/20 border-yellow-500/80 text-yellow-200 shadow-md shadow-yellow-500/10 font-bold'
                  : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full border shrink-0 ${
                  options.outputFormat === '23andMe' ? 'bg-yellow-500 border-yellow-300' : 'border-zinc-600'
                }`}
              />
              <span>23andMe (4-col)</span>
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
