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

export type BuildOverride = 'auto' | 'GRCh37' | 'GRCh38';

export interface LiftoverStats {
  kit: 'kit1' | 'kit2';
  fromBuild: string;
  toBuild: string;
  remappedCount: number;
  droppedCount: number;
}

export interface MergeOptions {
  primaryAuthority: 'weighted_consensus' | 'kit1' | 'kit2';
  outputFormat: 'ancestry' | '23andMe';
  targetBuild?: 'GRCh37' | 'GRCh38';
  kit1BuildOverride?: BuildOverride;
  kit2BuildOverride?: BuildOverride;
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

import type { HaplogroupSummary, HaplogroupComparison } from './haplogroup';

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
  concordanceRate?: number;
  heterozygosityRate?: number;
  donorMatchStatus?: 'IDENTICAL_DONOR' | 'HIGH_CONCORDANCE' | 'SUSPECT_MISMATCH' | 'DIFFERENT_DONORS';
  kit1Build?: string;
  kit2Build?: string;
  targetBuild?: string;
  liftoverStats?: LiftoverStats[];
  inferredSex?: 'MALE' | 'FEMALE' | 'AMBIGUOUS';
  xHeterozygosityRate?: number;
  hemizygousSanitizedCount?: number;
  indelsHarmonizedCount?: number;
  kit1Haplogroups?: HaplogroupSummary;
  kit2Haplogroups?: HaplogroupSummary;
  superKitHaplogroups?: HaplogroupSummary;
  haplogroupComparison?: HaplogroupComparison;
}

export interface WorkerErrorMessage {
  type: 'ERROR';
  error: string;
}

export type WorkerMessage = WorkerProgressMessage | WorkerSuccessMessage | WorkerErrorMessage;
