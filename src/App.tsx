import React, { useState, useRef, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Header } from './components/Header';
import { FileDropzone } from './components/FileDropzone';
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { ProcessingProgress } from './components/ProcessingProgress';
import { SummaryDashboard } from './components/SummaryDashboard';
import { ChromosomeDistributionChart } from './components/ChromosomeDistributionChart';
import { PreviewModal } from './components/PreviewModal';
import { VideoModal } from './components/VideoModal';
import { Footer } from './components/Footer';

import {
  generateSampleKit1Text,
  generateSampleKit2Text,
} from './utils/sampleDataGenerator';

import type {
  KitFileMetadata,
  MergeOptions,
  VendorFormat,
  WorkerMessage,
  WorkerProgressMessage,
  WorkerSuccessMessage,
} from './types/dna';

export const App: React.FC = () => {
  const [kit1Metadata, setKit1Metadata] = useState<KitFileMetadata | null>(null);
  const [kit2Metadata, setKit2Metadata] = useState<KitFileMetadata | null>(null);
  const [kit1File, setKit1File] = useState<File | null>(null);
  const [kit2File, setKit2File] = useState<File | null>(null);
  const [kit1Text, setKit1Text] = useState<string>('');
  const [kit2Text, setKit2Text] = useState<string>('');

  const [options, setOptions] = useState<MergeOptions>({
    primaryAuthority: 'kit1',
    outputFormat: 'ancestry',
  });

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<WorkerProgressMessage | null>(null);
  const [result, setResult] = useState<WorkerSuccessMessage | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [isVideoOpen, setIsVideoOpen] = useState<boolean>(false);

  const workerRef = useRef<Worker | null>(null);

  // Initialize Web Worker
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('./worker/superkitWorker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const msg = event.data;
      if (msg.type === 'PROGRESS') {
        setProgress(msg);
      } else if (msg.type === 'SUCCESS') {
        setResult(msg);
        setIsProcessing(false);
        setProgress(null);
        // Automatically launch Ethereal Video Modal on completion!
        setIsVideoOpen(true);
      } else if (msg.type === 'ERROR') {
        setErrorMessage(msg.error);
        setIsProcessing(false);
        setProgress(null);
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Format Auto-Detection
  const detectVendorFormat = (textSample: string): VendorFormat => {
    const sample = textSample.substring(0, 4000).toLowerCase();
    if (sample.includes('ancestry') || (sample.includes('allele1') && sample.includes('allele2'))) {
      return 'ancestry';
    }
    if (sample.includes('23andme') || sample.includes('genotype')) {
      return '23andme';
    }
    if (sample.includes('result') || sample.includes('myheritage') || sample.includes('ftdna')) {
      return 'myheritage_ftdna';
    }
    return 'unknown';
  };

  // Handle user uploading/selecting a file (fast 4KB slice header inspection)
  const handleFileSelected = (kitId: 'kit1' | 'kit2', file: File) => {
    setErrorMessage(null);
    setResult(null);

    // Read only the first 4KB of the file for instant header format detection
    const sampleSlice = file.slice(0, 4000);
    const reader = new FileReader();
    reader.onload = (e) => {
      const sampleText = e.target?.result as string;
      const vendor = detectVendorFormat(sampleText);

      const meta: KitFileMetadata = {
        id: kitId,
        fileName: file.name,
        fileSize: file.size,
        vendor,
        file,
      };

      if (kitId === 'kit1') {
        setKit1Metadata(meta);
        setKit1File(file);
        setKit1Text(''); // Clear memory string
      } else {
        setKit2Metadata(meta);
        setKit2File(file);
        setKit2Text(''); // Clear memory string
      }
    };
    reader.readAsText(sampleSlice);
  };

  // Clear specific kit file
  const handleClearFile = (kitId: 'kit1' | 'kit2') => {
    setResult(null);
    if (kitId === 'kit1') {
      setKit1Metadata(null);
      setKit1File(null);
      setKit1Text('');
    } else {
      setKit2Metadata(null);
      setKit2File(null);
      setKit2Text('');
    }
  };

  // Load Built-in Realistic Mock Data
  const handleLoadSampleData = () => {
    setErrorMessage(null);
    setResult(null);

    const sample1 = generateSampleKit1Text();
    const sample2 = generateSampleKit2Text();

    setKit1Metadata({
      id: 'kit1',
      fileName: 'AncestryDNA_Sample_Kit1.txt',
      fileSize: new Blob([sample1]).size,
      vendor: 'ancestry',
    });
    setKit1Text(sample1);
    setKit1File(null);

    setKit2Metadata({
      id: 'kit2',
      fileName: '23andMe_Sample_Kit2.txt',
      fileSize: new Blob([sample2]).size,
      vendor: '23andme',
    });
    setKit2Text(sample2);
    setKit2File(null);
  };

  // Trigger Worker Merge with Zero-Copy Transferable ArrayBuffers
  const handleStartMerge = async () => {
    if ((!kit1File && !kit1Text) || (!kit2File && !kit2Text) || !workerRef.current) return;

    setErrorMessage(null);
    setResult(null);
    setIsProcessing(true);
    setProgress({
      type: 'PROGRESS',
      stage: 'parsing_kit1',
      stageNumber: 1,
      percentage: 5,
      detailMessage: 'Initializing zero-copy SuperKit Web Worker...',
    });

    try {
      if (kit1File && kit2File) {
        // Zero-copy Transferable ArrayBuffers for actual file uploads
        const kit1Buffer = await kit1File.arrayBuffer();
        const kit2Buffer = await kit2File.arrayBuffer();

        workerRef.current.postMessage(
          { kit1Buffer, kit2Buffer, options },
          [kit1Buffer, kit2Buffer] // Transfer ownership to worker thread!
        );
      } else {
        // Fallback for sample mock text strings
        workerRef.current.postMessage({
          kit1Text,
          kit2Text,
          options,
        });
      }
    } catch (err: unknown) {
      const errStr = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Failed to read input files: ${errStr}`);
      setIsProcessing(false);
    }
  };

  // Trigger Instant SuperKit Download
  const handleDownload = () => {
    if (!result) return;
    const blob = result.outputBlob || new Blob([result.outputContent || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DNA_SuperKit_GRCh37_${options.outputFormat}_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const canMerge = Boolean((kit1File || kit1Text) && (kit2File || kit2Text));

  return (
    <div className="min-h-screen bg-black text-zinc-100 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <Header onLoadSampleData={handleLoadSampleData} isProcessing={isProcessing} />

        {/* Error Banner if any */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-rose-400 font-bold hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Dropzones for Kit 1 & Kit 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <FileDropzone
            kitId="kit1"
            title="Kit 1 Dataset"
            subtitle="Primary or secondary genotyping file"
            metadata={kit1Metadata}
            onFileSelected={handleFileSelected}
            onClearFile={handleClearFile}
            isPrimary={options.primaryAuthority === 'kit1'}
            onSetPrimary={(id) => setOptions((prev) => ({ ...prev, primaryAuthority: id }))}
            disabled={isProcessing}
          />

          <FileDropzone
            kitId="kit2"
            title="Kit 2 Dataset"
            subtitle="Complementary genotyping file"
            metadata={kit2Metadata}
            onFileSelected={handleFileSelected}
            onClearFile={handleClearFile}
            isPrimary={options.primaryAuthority === 'kit2'}
            onSetPrimary={(id) => setOptions((prev) => ({ ...prev, primaryAuthority: id }))}
            disabled={isProcessing}
          />
        </div>

        {/* Configuration Panel */}
        <ConfigurationPanel
          options={options}
          onChangeOptions={setOptions}
          onStartMerge={handleStartMerge}
          canMerge={canMerge}
          isProcessing={isProcessing}
        />

        {/* Worker Processing Progress */}
        {isProcessing && <ProcessingProgress progress={progress} />}

        {/* Merge Summary Dashboard */}
        {result && (
          <>
            <SummaryDashboard
              result={result}
              onDownload={handleDownload}
              onOpenPreview={() => setIsPreviewOpen(true)}
              onOpenVideo={() => setIsVideoOpen(true)}
              onReset={() => {
                setResult(null);
                setKit1Metadata(null);
                setKit2Metadata(null);
                setKit1Text('');
                setKit2Text('');
              }}
            />

            {/* Chromosome Breakdown Chart */}
            <ChromosomeDistributionChart distribution={result.chromosomeDistribution} />

            {/* Preview Modal */}
            <PreviewModal
              isOpen={isPreviewOpen}
              onClose={() => setIsPreviewOpen(false)}
              rows={result.previewRows}
              outputFormat={result.outputFormat}
            />
          </>
        )}

        {/* Ethereal Video Modal Player */}
        <VideoModal
          isOpen={isVideoOpen}
          onClose={() => setIsVideoOpen(false)}
          onFinished={() => setIsVideoOpen(false)}
        />

        {/* Footer */}
        <Footer />
      </div>
      <Analytics />
    </div>
  );
};

export default App;
