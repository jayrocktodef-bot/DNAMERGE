/**
 * Insertion / Deletion (InDel) Harmonization Engine
 * 
 * Standardizes disparate microarray vendor indel representations:
 * 23andMe shorthand ('I'/'D') vs AncestryDNA/FTDNA sequence fragments ('AGCT'/'-').
 */

export interface IndelHarmonizeResult {
  a1: string;
  a2: string;
  isIndel: boolean;
  wasHarmonized: boolean;
}

/**
 * Standardizes a single allele token into canonical notation.
 * - '-' or 'DEL' -> 'D' (Deletion)
 * - multi-base sequences like 'AGCT' or 'INS' -> 'I' (Insertion)
 */
export function normalizeIndelToken(token: string): { normalized: string; isIndel: boolean } {
  const t = token.trim().toUpperCase();

  if (t === '-' || t === 'DEL' || t === 'D') {
    return { normalized: 'D', isIndel: true };
  }

  if (t === 'INS' || t === 'I') {
    return { normalized: 'I', isIndel: true };
  }

  // Multi-base insertion string (e.g. 'ACTG')
  if (t.length > 1 && /^[ACGT]+$/.test(t)) {
    return { normalized: 'I', isIndel: true };
  }

  return { normalized: t, isIndel: false };
}

/**
 * Harmonizes a pair of alleles to ensure cross-platform indel concordance.
 */
export function harmonizeIndelAlleles(rawA1: string, rawA2: string): IndelHarmonizeResult {
  const norm1 = normalizeIndelToken(rawA1);
  const norm2 = normalizeIndelToken(rawA2);

  const isIndel = norm1.isIndel || norm2.isIndel;
  const wasHarmonized = (norm1.isIndel && norm1.normalized !== rawA1) ||
                        (norm2.isIndel && norm2.normalized !== rawA2);

  let a1 = norm1.normalized;
  let a2 = norm2.normalized;

  // Maintain canonical sort order (e.g. D <= I)
  if (a1 > a2) {
    const tmp = a1;
    a1 = a2;
    a2 = tmp;
  }

  return {
    a1,
    a2,
    isIndel,
    wasHarmonized,
  };
}
