import React, { useState } from 'react';
import { X, Copy, Check, FileText } from 'lucide-react';
import type { CanonicalSNP } from '../types/dna';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  rows: CanonicalSNP[];
  outputFormat: 'ancestry' | '23andMe';
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  isOpen,
  onClose,
  rows,
  outputFormat,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyText = () => {
    let text = '';
    if (outputFormat === 'ancestry') {
      text = 'rsid\tchromosome\tposition\tallele1\tallele2\n';
      text += rows.map((r) => `${r.rsid}\t${r.chromosome}\t${r.position}\t${r.allele1}\t${r.allele2}`).join('\n');
    } else {
      text = '# rsid\tchromosome\tposition\tgenotype\n';
      text += rows.map((r) => `${r.rsid}\t${r.chromosome}\t${r.position}\t${r.allele1}${r.allele2}`).join('\n');
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] sm:max-h-[85vh] rounded-t-3xl sm:rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-2.5 sm:hidden bg-black/60">
          <div className="w-12 h-1.5 rounded-full bg-zinc-700" />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-800 bg-black/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">SuperKit Data Preview</h3>
              <p className="text-xs text-zinc-400">
                Top {rows.length} loci (<span className="uppercase text-amber-300 font-semibold font-mono">{outputFormat}</span>)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              className="min-h-[40px] px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-medium transition-colors flex items-center gap-1.5 touch-manipulation active:scale-95"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
              <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy Sample'}</span>
            </button>

            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors touch-manipulation active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content Table */}
        <div className="flex-1 overflow-auto p-3 sm:p-4 font-mono text-xs overscroll-contain">
          <table className="w-full text-left border-collapse min-w-[360px]">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 bg-black/80 sticky top-0">
                <th className="py-2 px-2.5">#</th>
                <th className="py-2 px-2.5">rsid</th>
                <th className="py-2 px-2.5">chr</th>
                <th className="py-2 px-2.5">position</th>
                {outputFormat === 'ancestry' ? (
                  <>
                    <th className="py-2 px-2.5">a1</th>
                    <th className="py-2 px-2.5">a2</th>
                  </>
                ) : (
                  <th className="py-2 px-2.5">genotype</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-zinc-900/50 transition-colors">
                  <td className="py-2 px-2.5 text-zinc-600">{idx + 1}</td>
                  <td className="py-2 px-2.5 text-amber-300 font-semibold">{row.rsid}</td>
                  <td className="py-2 px-2.5 text-yellow-200">{row.chromosome}</td>
                  <td className="py-2 px-2.5 text-zinc-400">{row.position.toLocaleString()}</td>
                  {outputFormat === 'ancestry' ? (
                    <>
                      <td className="py-2 px-2.5 text-emerald-400 font-bold">{row.allele1}</td>
                      <td className="py-2 px-2.5 text-emerald-400 font-bold">{row.allele2}</td>
                    </>
                  ) : (
                    <td className="py-2 px-2.5 text-emerald-400 font-bold">{`${row.allele1}${row.allele2}`}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-800 bg-black/60 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto min-h-[48px] px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors touch-manipulation active:scale-95"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
