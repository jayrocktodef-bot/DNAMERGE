import React from 'react';
import { Lock, Shield, Cpu, ExternalLink, Globe } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-12 pt-8 border-t border-zinc-800 text-zinc-400 text-xs text-center space-y-6">
      {/* Brand Header in Footer */}
      <div className="flex flex-col items-center justify-center gap-2">
        <a
          href="https://writteninthegenome.blog"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 group"
        >
          <div className="w-8 h-8 rounded-full overflow-hidden border border-amber-500/40 p-0.5 bg-black">
            <img
              src="/blog-logo.webp"
              alt="Written in the Genome Logo"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <span className="text-sm font-extrabold tracking-tight text-white uppercase group-hover:text-amber-400 transition-colors">
            WRITTEN IN THE <span className="text-amber-400">GENOME</span>
          </span>
        </a>
      </div>

      {/* Navigation links */}
      <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-medium">
        <a
          href="https://writteninthegenome.blog"
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Written in the Genome Blog</span>
          <ExternalLink className="w-3 h-3 opacity-70" />
        </a>

        <span className="text-zinc-700">•</span>

        <a
          href="https://scout.writteninthegenome.blog"
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1"
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Genotype Scout DNA Analysis</span>
          <ExternalLink className="w-3 h-3 opacity-70" />
        </a>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap items-center justify-center gap-6 text-zinc-400 font-medium">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-400" />
          <span>100% Client-Side Processing</span>
        </div>
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-yellow-400" />
          <span>Web Worker Engine</span>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-500" />
          <span>GRCh37 (hg19) Standard</span>
        </div>
      </div>

      <p className="text-zinc-500 max-w-md mx-auto">
        DNA SuperKit Builder • Written in the Genome • No genetic raw data is transmitted or stored on any server.
      </p>
    </footer>
  );
};
