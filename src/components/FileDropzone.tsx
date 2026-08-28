import React, { useRef } from 'react';
import { Upload, FileCheck, X, CheckCircle2 } from 'lucide-react';
import type { KitFileMetadata, VendorFormat } from '../types/dna';

interface FileDropzoneProps {
  kitId: 'kit1' | 'kit2';
  title: string;
  subtitle: string;
  metadata: KitFileMetadata | null;
  onFileSelected: (kitId: 'kit1' | 'kit2', file: File) => void;
  onClearFile: (kitId: 'kit1' | 'kit2') => void;
  isPrimary: boolean;
  onSetPrimary: (kitId: 'kit1' | 'kit2') => void;
  disabled?: boolean;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  kitId,
  title,
  subtitle,
  metadata,
  onFileSelected,
  onClearFile,
  isPrimary,
  onSetPrimary,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelected(kitId, e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelected(kitId, e.target.files[0]);
    }
  };

  const getVendorBadge = (vendor: VendorFormat) => {
    switch (vendor) {
      case 'ancestry':
        return { label: 'AncestryDNA', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
      case '23andme':
        return { label: '23andMe', bg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' };
      case 'myheritage_ftdna':
        return { label: 'MyHeritage / FTDNA', bg: 'bg-amber-600/20 text-amber-200 border-amber-600/40' };
      default:
        return { label: 'DTC Raw Data', bg: 'bg-zinc-800 text-zinc-300 border-zinc-700' };
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div
      className={`relative rounded-2xl border transition-all duration-300 p-5 sm:p-6 flex flex-col justify-between ${
        metadata
          ? 'bg-zinc-950 border-amber-500/40 shadow-lg shadow-amber-500/10'
          : 'bg-zinc-950/60 border-dashed border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-950'
      } ${isPrimary ? 'ring-2 ring-amber-500/50' : ''}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".txt,.csv,.tsv,.raw,.zip,.gz"
        className="hidden"
        disabled={disabled}
      />

      {/* Header section of dropzone */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm font-mono shrink-0 ${
              kitId === 'kit1' ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40' : 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/40'
            }`}
          >
            {kitId === 'kit1' ? 'K1' : 'K2'}
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-white leading-tight">{title}</h2>
            <p className="text-[11px] sm:text-xs text-zinc-400">{subtitle}</p>
          </div>
        </div>

        {/* Primary Authority Radio Toggle Badge */}
        <button
          type="button"
          onClick={() => onSetPrimary(kitId)}
          disabled={disabled}
          className={`min-h-[40px] px-3 py-1.5 rounded-full text-xs font-medium transition-all border flex items-center gap-1.5 touch-manipulation active:scale-95 ${
            isPrimary
              ? 'bg-amber-500/30 text-amber-200 border-amber-500/70 shadow-sm shadow-amber-500/20 font-bold'
              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
          }`}
        >
          <CheckCircle2 className={`w-3.5 h-3.5 ${isPrimary ? 'text-amber-400' : 'text-zinc-500'}`} />
          <span>{isPrimary ? 'Primary' : 'Set Primary'}</span>
        </button>
      </div>

      {/* Main Body */}
      {metadata ? (
        <div className="relative rounded-xl bg-black border border-zinc-800 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-lg bg-amber-950/60 border border-amber-500/30 flex items-center justify-center shrink-0">
                <FileCheck className="w-5 h-5 text-amber-400" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs sm:text-sm font-medium text-zinc-200 truncate">{metadata.fileName}</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">{formatFileSize(metadata.fileSize)}</p>
              </div>
            </div>
            {!disabled && (
              <button
                onClick={() => onClearFile(kitId)}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors touch-manipulation active:scale-90"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-xs">
            <span className="text-zinc-400 text-[11px]">Detected Format:</span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-md font-medium border text-[11px] ${
                getVendorBadge(metadata.vendor).bg
              }`}
            >
              {getVendorBadge(metadata.vendor).label}
            </span>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !disabled && fileInputRef.current?.click()}
          className="cursor-pointer my-2 sm:my-4 py-6 sm:py-8 flex flex-col items-center justify-center gap-3 text-center touch-manipulation active:scale-[0.99]"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Upload className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-medium text-zinc-200">
              Tap to browse or drop raw DNA file
            </p>
            <p className="text-[11px] text-zinc-500 mt-1">AncestryDNA, 23andMe, MyHeritage, FTDNA (.txt, .csv)</p>
          </div>
        </div>
      )}
    </div>
  );
};
