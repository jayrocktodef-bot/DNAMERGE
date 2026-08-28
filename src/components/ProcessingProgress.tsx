import React from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import type { WorkerProgressMessage } from '../types/dna';

interface ProcessingProgressProps {
  progress: WorkerProgressMessage | null;
}

export const ProcessingProgress: React.FC<ProcessingProgressProps> = ({ progress }) => {
  if (!progress) return null;

  const stages = [
    { number: 1, label: 'Parsing Kit 1' },
    { number: 2, label: 'Parsing Kit 2' },
    { number: 3, label: 'Merging Loci' },
    { number: 4, label: 'Coordinate Sorting' },
    { number: 5, label: 'Generating Output' },
  ];

  const currentStageNum = progress.stageNumber || 1;

  return (
    <div className="rounded-2xl bg-zinc-950/90 border border-amber-500/40 p-6 shadow-2xl backdrop-blur-xl mb-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
          <div>
            <h3 className="text-base font-semibold text-white">Merging Raw DNA Datasets</h3>
            <p className="text-xs text-zinc-400 mt-0.5">{progress.detailMessage}</p>
          </div>
        </div>
        <span className="text-xl font-bold font-mono text-amber-400">{progress.percentage}%</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-black rounded-full h-3 p-0.5 border border-zinc-800 overflow-hidden">
        <div
          className="bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-500 h-full rounded-full transition-all duration-300 ease-out shadow-sm shadow-amber-500/50"
          style={{ width: `${Math.max(5, progress.percentage)}%` }}
        />
      </div>

      {/* Multi-stage Stepper */}
      <div className="grid grid-cols-5 gap-2 pt-2 border-t border-zinc-800">
        {stages.map((stage) => {
          const isDone = stage.number < currentStageNum || progress.stage === 'completed';
          const isCurrent = stage.number === currentStageNum && progress.stage !== 'completed';

          return (
            <div key={stage.number} className="flex flex-col items-center text-center space-y-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                  isDone
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : isCurrent
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/50 animate-pulse font-bold'
                    : 'bg-black text-zinc-600 border border-zinc-800'
                }`}
              >
                {isDone ? <CheckCircle2 className="w-4 h-4" /> : stage.number}
              </div>
              <span
                className={`text-[11px] font-medium leading-tight hidden sm:block ${
                  isDone
                    ? 'text-amber-400'
                    : isCurrent
                    ? 'text-amber-300 font-semibold'
                    : 'text-zinc-600'
                }`}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
