/**
 * Biological Sex Inference & Hemizygous Quality Control Engine
 * 
 * Accurately determines sample biological sex via non-pseudoautosomal (non-PAR)
 * Chromosome X heterozygosity rates and Y-chromosome probe coverage, and
 * enforces biological hemizygous constraints on male X, Y, and MT loci.
 */

export interface ParRegion {
  start: number;
  end: number;
}

export const GRCH37_PAR1: ParRegion = { start: 10001, end: 2699520 };
export const GRCH37_PAR2: ParRegion = { start: 154931044, end: 155260560 };

export const GRCH38_PAR1: ParRegion = { start: 10001, end: 2781479 };
export const GRCH38_PAR2: ParRegion = { start: 155701383, end: 156030895 };

/**
 * Determines whether a coordinate on Chromosome X falls within the Pseudoautosomal Regions.
 */
export function isPseudoautosomal(pos: number, build: 'GRCh37' | 'GRCh38' = 'GRCh37'): boolean {
  if (build === 'GRCh38') {
    return (pos >= GRCH38_PAR1.start && pos <= GRCH38_PAR1.end) ||
           (pos >= GRCH38_PAR2.start && pos <= GRCH38_PAR2.end);
  }
  return (pos >= GRCH37_PAR1.start && pos <= GRCH37_PAR1.end) ||
         (pos >= GRCH37_PAR2.start && pos <= GRCH37_PAR2.end);
}

export interface InferredSexResult {
  inferredSex: 'MALE' | 'FEMALE' | 'AMBIGUOUS';
  xHetRate: number;
  nonParCount: number;
  nonParHetCount: number;
}

/**
 * Infers biological sex from Chromosome X heterozygosity and Y-chromosome representation.
 * - Biological females (XX) exhibit normal diploid heterozygosity on non-PAR Chr X (~20% - 35%).
 * - Biological males (XY) exhibit near-zero non-PAR Chr X heterozygosity (< 0.5%), with any
 *   heterozygous calls arising solely from fluorophore cross-talk or chip dye bleed.
 */
export function inferBiologicalSex(
  xSnps: Array<{ pos: number; a1: string; a2: string; isValid: boolean }>,
  yCallCount: number,
  build: 'GRCh37' | 'GRCh38' = 'GRCh37'
): InferredSexResult {
  let nonParCount = 0;
  let nonParHetCount = 0;

  for (let i = 0; i < xSnps.length; i++) {
    const s = xSnps[i];
    if (!s.isValid || s.a1 === '0' || s.a2 === '0') continue;
    if (isPseudoautosomal(s.pos, build)) continue;

    nonParCount++;
    if (s.a1 !== s.a2) {
      nonParHetCount++;
    }
  }

  const xHetRate = nonParCount > 0 ? (nonParHetCount / nonParCount) * 100 : 0;

  let inferredSex: 'MALE' | 'FEMALE' | 'AMBIGUOUS' = 'AMBIGUOUS';

  if (nonParCount >= 100) {
    if (xHetRate >= 12.0) {
      inferredSex = 'FEMALE';
    } else if (xHetRate <= 2.5) {
      inferredSex = 'MALE';
    } else if (yCallCount >= 200) {
      inferredSex = 'MALE';
    }
  } else if (yCallCount >= 500) {
    inferredSex = 'MALE';
  }

  return {
    inferredSex,
    xHetRate: Math.round(xHetRate * 100) / 100,
    nonParCount,
    nonParHetCount,
  };
}

export interface HemizygousSanitizeResult {
  a1: string;
  a2: string;
  wasSanitized: boolean;
}

/**
 * Enforces hemizygous biological constraints:
 * - On Chr Y and Chr MT: Biological haploidy precludes genuine heterozygosity. If a kit
 *   outputs discordant heterozygous calls (e.g. 'A' and 'G'), resolves to dominant single allele.
 * - On Male non-PAR Chr X: Resolves erroneous dye-bleed heterozygotes into single-allele calls.
 */
export function sanitizeHemizygousLocus(
  chr: string,
  pos: number,
  a1: string,
  a2: string,
  inferredSex: 'MALE' | 'FEMALE' | 'AMBIGUOUS',
  build: 'GRCh37' | 'GRCh38' = 'GRCh37'
): HemizygousSanitizeResult {
  if (a1 === '0' || a2 === '0' || a1 === a2) {
    return { a1, a2, wasSanitized: false };
  }

  // 1. Chr Y or Chr MT: strictly hemizygous/haploid for all individuals
  if (chr === 'Y' || chr === 'MT') {
    // Pick the primary valid allele
    return { a1, a2: a1, wasSanitized: true };
  }

  // 2. Chr X in biological males: non-PAR is hemizygous
  if (chr === 'X' && inferredSex === 'MALE') {
    if (!isPseudoautosomal(pos, build)) {
      // In consumer raw format (AncestryDNA / 23andMe), males are reported as homozygous (e.g. A A)
      // to indicate the presence of that single hemizygous allele on their single X.
      return { a1, a2: a1, wasSanitized: true };
    }
  }

  return { a1, a2, wasSanitized: false };
}
