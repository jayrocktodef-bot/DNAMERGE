export type LineageType = 'PATERNAL_YDNA' | 'MATERNAL_MTDNA';

export type MarkerStatus = 
  | 'POSITIVE_DERIVED'   // Matches defining derived mutation
  | 'NEGATIVE_ANCESTRAL'  // Matches ancestral base (unmutated)
  | 'NO_CALL'             // Missing, uncalled (-- / 00)
  | 'MISMATCH';           // Genotype differs from both ancestral & expected derived

export interface SnpMarker {
  name: string;             // e.g. "M269", "P312", "7028C", "H1-defining"
  rsid: string;             // e.g. "rs9786184", "rs2853499"
  chromosome: string;       // "Y" or "MT"
  position: number;         // Genomic coordinate (GRCh37 / rCRS)
  ancestralAllele: string;  // e.g. "T"
  derivedAllele: string;    // e.g. "C"
  haplogroup: string;       // e.g. "R1b-M269", "H1"
  lineageType: LineageType;
  description: string;
}

export interface EvaluatedMarker {
  snp: SnpMarker;
  kit1Genotype?: string;
  kit2Genotype?: string;
  superKitGenotype: string;
  status: MarkerStatus;
  details: string;
  mutationWeight?: number;
}

export interface HaplogroupDefinition {
  code: string;             // e.g. "R1b-U152", "H1", "E1b1a"
  shortName: string;        // e.g. "R-U152", "H1", "E-M2"
  cladeName: string;        // e.g. "R1b1a1b1a1a2", "H1"
  lineageType: LineageType;
  parentClade: string | null;
  definingSnps: string[];
  ageYearsBp: string;       // e.g. "~4,500 BP (Early Bronze Age)"
  originRegion: string;     // e.g. "Alps / Central Europe"
  historicalDescription: string;
  ancientCultures: string[];
}

export interface LineageAnalysis {
  lineageType: LineageType;
  terminalHaplogroup: HaplogroupDefinition;
  confidenceScore: number;      // 0 - 100%
  positiveCount: number;
  negativeCount: number;
  totalTestedMarkers: number;
  lineageTreePath: HaplogroupDefinition[];
  evaluatedMarkers: EvaluatedMarker[];
}

export interface HaplogroupSummary {
  yDna: LineageAnalysis | null;
  mtDna: LineageAnalysis | null;
  isMale: boolean;
  yCount: number;
  mtCount: number;
}

export interface HaplogroupComparison {
  paternalUpgradeText?: string;
  maternalUpgradeText?: string;
  paternalCladesGained: number;
  maternalCladesGained: number;
  yDnaSynergyCount: number;
  mtDnaSynergyCount: number;
  evaluatedMarkers: EvaluatedMarker[];
}
