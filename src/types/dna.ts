export type VendorFormat = 'ancestry' | '23andme' | 'myheritage_ftdna' | 'unknown';

export interface CanonicalSNP {
  rsid: string;
  chromosome: string;
  position: number;
  allele1: string;
  allele2: string;
}

export interface KitFileMetadata {
  id: 'kit1' | 'kit2';
  fileName: string;
  fileSize: number;
  lineCount?: number;
  vendor: VendorFormat;
  rawContent?: string;
  file?: File;
}

export interface MergeOptions {
  primaryAuthority: 'kit1' | 'kit2';
  outputFormat: 'ancestry' | '23andMe';
}

export type ProcessingStage =
  | 'idle'
  | 'parsing_kit1'
  | 'parsing_kit2'
  | 'merging'
  | 'sorting'
  | 'generating_output'
  | 'completed'
  | 'error';

export interface WorkerProgressMessage {
  type: 'PROGRESS';
  stage: ProcessingStage;
  stageNumber: number; // 1 to 5
  percentage: number;
  detailMessage: string;
}

export interface ChromosomeCount {
  chr: string;
  count: number;
}

export interface WorkerSuccessMessage {
  type: 'SUCCESS';
  totalKit1Count: number;
  totalKit2Count: number;
  overlappingCount: number;
  gapFilledCount: number;
  discordantCount: number;
  uniqueKit1Count: number;
  uniqueKit2Count: number;
  totalSuperKitCount: number;
  outputFormat: 'ancestry' | '23andMe';
  outputBlob?: Blob;
  outputContent?: string;
  previewRows: CanonicalSNP[];
  chromosomeDistribution: ChromosomeCount[];
  executionTimeMs: number;
}

export interface WorkerErrorMessage {
  type: 'ERROR';
  error: string;
}

export type WorkerMessage = WorkerProgressMessage | WorkerSuccessMessage | WorkerErrorMessage;
