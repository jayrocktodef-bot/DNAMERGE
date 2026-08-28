import React from 'react';
import { Sparkles, ShieldCheck, ExternalLink, Globe, Cpu } from 'lucide-react';

interface HeaderProps {
  onLoadSampleData: () => void;
  isProcessing: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onLoadSampleData, isProcessing }) => {
  return (
    <header className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-zinc-950 via-black to-zinc-950 border border-amber-500/30 p-4 sm:p-6 md:p-8 shadow-2xl backdrop-blur-xl mb-6 sm:mb-8">
      {/* Ambient Glow */}
      <div className="absolute -top-24 -left-24 w-72 sm:w-96 h-72 sm:h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 sm:w-96 h-72 sm:h-96 bg-yellow-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Branding Navigation Bar */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-5 border-b border-zinc-800/80">
        {/* Logo & Brand Title */}
        <a
          href="https://writteninthegenome.blog"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 group cursor-pointer select-none"
          title="Visit Written in the Genome Blog"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-amber-500/40 p-0.5 bg-black shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-all shrink-0">
            <img
              src="/blog-logo.webp"
              alt="Written in the Genome Logo"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <div>
            <span className="text-xs sm:text-sm md:text-base font-black tracking-tight text-white uppercase font-sans block">
              WRITTEN IN THE <span className="text-amber-400 underline decoration-amber-500 underline-offset-4">GENOME</span>
            </span>
            <span className="text-[9px] sm:text-[10px] md:text-xs font-mono tracking-wider text-zinc-400 uppercase block">
              Genetics, DNA Science & Genealogy
            </span>
          </div>
        </a>

        {/* Links to Blog & Genotype Scout */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <a
            href="https://writteninthegenome.blog"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-none min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-amber-300 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 touch-manipulation active:scale-95"
          >
            <Globe className="w-4 h-4 text-amber-400" />
            <span>Blog</span>
            <ExternalLink className="w-3 h-3 text-zinc-500" />
          </a>

          <a
            href="https://scout.writteninthegenome.blog"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-none min-h-[44px] px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:text-amber-200 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 touch-manipulation active:scale-95"
          >
            <Cpu className="w-4 h-4 text-amber-400" />
            <span>Genotype Scout</span>
            <ExternalLink className="w-3 h-3 text-amber-400/70" />
          </a>
        </div>
      </div>

      {/* Main Header Content */}
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-white font-sans uppercase">
              DNA SuperKit Builder
            </h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
              <ShieldCheck className="w-3.5 h-3.5" /> GRCh37 (hg19)
            </span>
          </div>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1.5 max-w-xl">
            Merge raw autosomal DNA microarray files into a deduplicated, high-density SuperKit file in 100% client-side Web Workers.
          </p>
        </div>

        <button
          onClick={onLoadSampleData}
          disabled={isProcessing}
          className="w-full sm:w-auto min-h-[48px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex items-center justify-center gap-2 touch-manipulation active:scale-95"
        >
          <Sparkles className="w-4 h-4 text-slate-950" />
          <span>Load Sample Kits</span>
        </button>
      </div>
    </header>
  );
};
