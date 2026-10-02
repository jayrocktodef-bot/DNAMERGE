/**
 * Genome Build Detection & Platform Confidence Profiler
 * 
 * Automatically identifies GRCh37 vs GRCh38 genomic coordinates via sentinel
 * cross-build SNP positions, and estimates platform-specific accuracy priors.
 */

export interface SentinelRecord {
  rsid: string;
  chr: string;
  pos37: number;
  pos38: number;
}

export const SENTINEL_SNPS: SentinelRecord[] = [
  { rsid: 'rs3094315', chr: '1', pos37: 752566, pos38: 817186 },
  { rsid: 'rs2980300', chr: '1', pos37: 785989, pos38: 850609 },
  { rsid: 'rs4477212', chr: '1', pos37: 14464, pos38: 82154 },
  { rsid: 'rs2298217', chr: '1', pos37: 1049285, pos38: 1113905 },
  { rsid: 'rs2185539', chr: '1', pos37: 1156131, pos38: 1220751 },
  { rsid: 'rs11240777', chr: '1', pos37: 1298972, pos38: 1363592 },
  { rsid: 'rs6685064', chr: '1', pos37: 2207167, pos38: 2271787 },
  { rsid: 'rs4970383', chr: '1', pos37: 3824490, pos38: 3889110 },
  { rsid: 'rs10492972', chr: '1', pos37: 9534062, pos38: 9598682 },
  { rsid: 'rs3131972', chr: '6', pos37: 31321455, pos38: 31353683 },
  { rsid: 'rs10456205', chr: '6', pos37: 161010098, pos38: 160584742 },
  { rsid: 'rs1801133', chr: '1', pos37: 11856378, pos38: 11796321 },
  { rsid: 'rs1801131', chr: '1', pos37: 11854476, pos38: 11794419 },
  { rsid: 'rs12913832', chr: '15', pos37: 28365618, pos38: 28120472 },
  { rsid: 'rs1800497', chr: '11', pos37: 113280402, pos38: 113409605 },
  { rsid: 'rs1333049', chr: '9', pos37: 22125503, pos38: 22125503 },
  { rsid: 'rs4680', chr: '22', pos37: 19951271, pos38: 19963748 },
  { rsid: 'rs6323', chr: 'X', pos37: 43603413, pos38: 43717208 },
];

export interface DetectedBuildInfo {
  build: 'GRCh37' | 'GRCh38' | 'Unknown';
  confidence: number; // 0 - 1
  matches37: number;
  matches38: number;
  testedSentinels: number;
}

export function detectGenomeBuild(
  rsidMap: Map<string, { chr: string; pos: number }>
): DetectedBuildInfo {
  let matches37 = 0;
  let matches38 = 0;
  let tested = 0;

  for (const s of SENTINEL_SNPS) {
    const loc = rsidMap.get(s.rsid.toLowerCase());
    if (loc) {
      tested++;
      if (loc.pos === s.pos37) {
        matches37++;
      } else if (loc.pos === s.pos38) {
        matches38++;
      }
    }
  }

  if (tested === 0) {
    return { build: 'Unknown', confidence: 0, matches37: 0, matches38: 0, testedSentinels: 0 };
  }

  const ratio37 = matches37 / tested;
  const ratio38 = matches38 / tested;

  if (matches37 > matches38 && ratio37 >= 0.7) {
    return { build: 'GRCh37', confidence: ratio37, matches37, matches38, testedSentinels: tested };
  }
  if (matches38 > matches37 && ratio38 >= 0.7) {
    return { build: 'GRCh38', confidence: ratio38, matches37, matches38, testedSentinels: tested };
  }

  return {
    build: 'Unknown',
    confidence: Math.max(ratio37, ratio38),
    matches37,
    matches38,
    testedSentinels: tested,
  };
}

export interface PlatformProfile {
  name: string;
  baseWeight: number;
}

export function inferPlatformProfile(sampleText: string, snpCount: number, detectedBuild: string): PlatformProfile {
  const lower = sampleText.substring(0, 3000).toLowerCase();

  // Whole Genome Sequencing (VCF / 3M+ calls)
  if (lower.includes('##fileformat=vcf') || snpCount > 2500000) {
    return { name: 'Whole Genome Sequencing (WGS)', baseWeight: 1.0 };
  }

  // 23andMe
  if (lower.includes('23andme')) {
    if (detectedBuild === 'GRCh38' || snpCount < 660000) {
      return { name: '23andMe v5 (Illumina GSA)', baseWeight: 0.88 };
    }
    if (snpCount > 800000) {
      return { name: '23andMe v3 (OmniExpress+)', baseWeight: 0.76 };
    }
    return { name: '23andMe v4 (Illumina OmniExpress)', baseWeight: 0.82 };
  }

  // AncestryDNA
  if (lower.includes('ancestry') || (lower.includes('allele1') && lower.includes('allele2'))) {
    if (snpCount > 680000) {
      return { name: 'AncestryDNA v2 (Illumina OmniExpress)', baseWeight: 0.83 };
    }
    return { name: 'AncestryDNA v1 (OmniCustom)', baseWeight: 0.75 };
  }

  // MyHeritage / FamilyTreeDNA
  if (lower.includes('myheritage') || lower.includes('ftdna') || lower.includes('family tree dna')) {
    return { name: 'MyHeritage / FTDNA (Illumina GSA)', baseWeight: 0.85 };
  }

  // Fallback by SNP count
  if (snpCount >= 600000) {
    return { name: 'Illumina BeadChip Array', baseWeight: 0.80 };
  }

  return { name: 'Generic Microarray', baseWeight: 0.75 };
}
