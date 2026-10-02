import { describe, it, expect } from 'vitest';
import { HaplogroupEngine, expandIupac } from '../services/haplogroupEngine';
import { ALL_HAPLOGROUP_DEFINING_SNPS } from '../data/haplogroupReference';

describe('Haplogroup Engine Correctness & Regression Tests', () => {
  describe('Fix 2: Zero-Evidence Calls Return Null', () => {
    it('returns null for mtDNA when zero positive derived markers are detected', () => {
      // Create empty dataset (no positive markers)
      const snpMap = new Map<string, { a1: string; a2: string; isValid: boolean }>();
      const evaluated = HaplogroupEngine.evaluateDataset(snpMap);

      const mtResult = HaplogroupEngine.classifyLineage('MATERNAL_MTDNA', evaluated);
      // Previously, mtDNA fell through to scored[0] at 70% confidence. Fix 2 requires null.
      expect(mtResult).toBeNull();
    });

    it('returns null for Y-DNA when zero positive derived markers are detected', () => {
      const snpMap = new Map<string, { a1: string; a2: string; isValid: boolean }>();
      const evaluated = HaplogroupEngine.evaluateDataset(snpMap);

      const yResult = HaplogroupEngine.classifyLineage('PATERNAL_YDNA', evaluated);
      expect(yResult).toBeNull();
    });

    it('returns null for mtDNA even if all markers are ancestral or uncalled', () => {
      const snpMap = new Map<string, { a1: string; a2: string; isValid: boolean }>();
      // Mark defining markers as ancestral
      for (const snp of ALL_HAPLOGROUP_DEFINING_SNPS) {
        if (snp.lineageType === 'MATERNAL_MTDNA') {
          snpMap.set(`${snp.chromosome.toUpperCase()}:${snp.position}`, {
            a1: snp.ancestralAllele,
            a2: snp.ancestralAllele,
            isValid: true,
          });
        }
      }

      const evaluated = HaplogroupEngine.evaluateDataset(snpMap);
      const mtResult = HaplogroupEngine.classifyLineage('MATERNAL_MTDNA', evaluated);
      expect(mtResult).toBeNull();
    });
  });

  describe('Fix 3: Heteroplasmy & IUPAC Expansion', () => {
    it('correctly expands single-letter IUPAC heterozygote codes', () => {
      expect(expandIupac('R')).toBe('AG');
      expect(expandIupac('Y')).toBe('CT');
      expect(expandIupac('S')).toBe('GC');
      expect(expandIupac('W')).toBe('AT');
      expect(expandIupac('K')).toBe('GT');
      expect(expandIupac('M')).toBe('AC');
      expect(expandIupac('B')).toBe('CGT');
      expect(expandIupac('H')).toBe('ACT');
      expect(expandIupac('V')).toBe('ACG');
    });

    it('never expands "D" (deletion) or "N" (no-call)', () => {
      expect(expandIupac('D')).toBe('D');
      expect(expandIupac('N')).toBe('N');
      expect(expandIupac('d')).toBe('D');
      expect(expandIupac('n')).toBe('N');
    });

    it('identifies POSITIVE_DERIVED when user genotype is a single-letter IUPAC mixture', () => {
      // Find an mtDNA marker where derivedAllele is G
      const markerWithG = ALL_HAPLOGROUP_DEFINING_SNPS.find(
        (s) => s.lineageType === 'MATERNAL_MTDNA' && s.derivedAllele.toUpperCase() === 'G'
      );
      expect(markerWithG).toBeDefined();

      if (markerWithG) {
        const snpMap = new Map<string, { a1: string; a2: string; isValid: boolean }>();
        // 'R' represents A or G
        snpMap.set(`${markerWithG.chromosome.toUpperCase()}:${markerWithG.position}`, {
          a1: 'R',
          a2: 'R',
          isValid: true,
        });

        const evaluated = HaplogroupEngine.evaluateDataset(snpMap);
        const markerResult = evaluated.find((m) => m.snp.name === markerWithG.name);
        expect(markerResult?.status).toBe('POSITIVE_DERIVED');
      }
    });

    it('identifies POSITIVE_DERIVED when user genotype is a standard two-letter heterozygote', () => {
      const marker = ALL_HAPLOGROUP_DEFINING_SNPS.find(
        (s) => s.lineageType === 'MATERNAL_MTDNA' && s.derivedAllele.toUpperCase() === 'C'
      );
      expect(marker).toBeDefined();

      if (marker) {
        const snpMap = new Map<string, { a1: string; a2: string; isValid: boolean }>();
        snpMap.set(`${marker.chromosome.toUpperCase()}:${marker.position}`, {
          a1: 'A',
          a2: 'C',
          isValid: true,
        });

        const evaluated = HaplogroupEngine.evaluateDataset(snpMap);
        const markerResult = evaluated.find((m) => m.snp.name === marker.name);
        expect(markerResult?.status).toBe('POSITIVE_DERIVED');
      }
    });

    it('does not match derived through expansion when allele is "N" or invalid', () => {
      const marker = ALL_HAPLOGROUP_DEFINING_SNPS[0];
      const snpMap = new Map<string, { a1: string; a2: string; isValid: boolean }>();
      snpMap.set(`${marker.chromosome.toUpperCase()}:${marker.position}`, {
        a1: 'N',
        a2: 'N',
        isValid: false,
      });

      const evaluated = HaplogroupEngine.evaluateDataset(snpMap);
      const markerResult = evaluated.find((m) => m.snp.name === marker.name);
      expect(markerResult?.status).toBe('NO_CALL');
    });
  });

  describe('Regression Anchor: Normal Multi-Marker Haplogroup Calls', () => {
    it('correctly classifies maternal H1 when defining markers are present', () => {
      // Find defining markers for H and H1
      const snpMap = new Map<string, { a1: string; a2: string; isValid: boolean }>();
      const hSnps = ALL_HAPLOGROUP_DEFINING_SNPS.filter(
        (s) => s.lineageType === 'MATERNAL_MTDNA' && (s.haplogroup === 'H' || s.haplogroup === 'H1')
      );

      for (const s of hSnps) {
        snpMap.set(`${s.chromosome.toUpperCase()}:${s.position}`, {
          a1: s.derivedAllele,
          a2: s.derivedAllele,
          isValid: true,
        });
      }

      const evaluated = HaplogroupEngine.evaluateDataset(snpMap);
      const mtResult = HaplogroupEngine.classifyLineage('MATERNAL_MTDNA', evaluated);
      expect(mtResult).not.toBeNull();
      expect(mtResult?.terminalHaplogroup.code).toBe('H1');
      expect(mtResult?.confidenceScore).toBeGreaterThanOrEqual(88);
    });

    it('correctly classifies paternal R1b-M269 when defining markers are present', () => {
      const snpMap = new Map<string, { a1: string; a2: string; isValid: boolean }>();
      const rSnps = ALL_HAPLOGROUP_DEFINING_SNPS.filter(
        (s) =>
          s.lineageType === 'PATERNAL_YDNA' &&
          ['CT', 'F', 'R1b', 'R1b-M269'].includes(s.haplogroup)
      );

      for (const s of rSnps) {
        snpMap.set(`${s.chromosome.toUpperCase()}:${s.position}`, {
          a1: s.derivedAllele,
          a2: s.derivedAllele,
          isValid: true,
        });
      }

      const evaluated = HaplogroupEngine.evaluateDataset(snpMap);
      const yResult = HaplogroupEngine.classifyLineage('PATERNAL_YDNA', evaluated);
      expect(yResult).not.toBeNull();
      expect(yResult?.terminalHaplogroup.code).toBe('R1b-M269');
      expect(yResult?.confidenceScore).toBeGreaterThanOrEqual(88);
    });
  });
});
