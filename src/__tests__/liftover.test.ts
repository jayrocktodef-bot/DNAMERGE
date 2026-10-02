import { describe, it, expect, beforeAll } from 'vitest';
import {
  loadChain,
  liftCoordinate,
  complementAllele,
  complementGenotype,
  liftSnpList,
  type ChainLookup,
  type ParsedLocus,
} from '../services/liftoverEngine';

describe('UCSC Chain Liftover Engine', () => {
  let chain19to38: ChainLookup;
  let chain38to19: ChainLookup;

  beforeAll(async () => {
    chain19to38 = await loadChain('GRCh37', 'GRCh38');
    chain38to19 = await loadChain('GRCh38', 'GRCh37');
  });

  describe('Bidirectional Sentinel SNP Coordinate Remapping', () => {
    // Verified bidirectional sentinel test vectors
    const bidirectionalSentinels = [
      { rsid: 'rs3094315', chr: '1', pos37: 752566, pos38: 817186 },
      { rsid: 'rs2980300', chr: '1', pos37: 785989, pos38: 850609 },
      { rsid: 'rs2298217', chr: '1', pos37: 1049285, pos38: 1113905 },
      { rsid: 'rs2185539', chr: '1', pos37: 1156131, pos38: 1220751 },
      { rsid: 'rs11240777', chr: '1', pos37: 1298972, pos38: 1363592 },
      { rsid: 'rs1801133', chr: '1', pos37: 11856378, pos38: 11796321 },
      { rsid: 'rs1801131', chr: '1', pos37: 11854476, pos38: 11794419 },
      { rsid: 'rs12913832', chr: '15', pos37: 28365618, pos38: 28120472 },
      { rsid: 'rs4680', chr: '22', pos37: 19951271, pos38: 19963748 },
    ];

    for (const s of bidirectionalSentinels) {
      it(`lifts ${s.rsid} forward from GRCh37 (${s.pos37}) to GRCh38 (${s.pos38})`, () => {
        const lifted = liftCoordinate(chain19to38, s.chr, s.pos37);
        expect(lifted).not.toBeNull();
        expect(lifted?.chr).toBe(s.chr);
        expect(lifted?.pos).toBe(s.pos38);
        expect(lifted?.strand).toBe('+');
      });

      it(`lifts ${s.rsid} reverse from GRCh38 (${s.pos38}) to GRCh37 (${s.pos37})`, () => {
        const lifted = liftCoordinate(chain38to19, s.chr, s.pos38);
        expect(lifted).not.toBeNull();
        expect(lifted?.chr).toBe(s.chr);
        expect(lifted?.pos).toBe(s.pos37);
        expect(lifted?.strand).toBe('+');
      });
    }
  });

  describe('Minus-Strand Liftover & Allele Complementation', () => {
    // Known minus-strand interval in hg19ToHg38 (chr1: 206072707-206332221)
    const minusStrandPos37 = 206089395;
    const expectedPos38 = 206251957;

    it('identifies minus strand interval and complements alleles', () => {
      const lifted = liftCoordinate(chain19to38, '1', minusStrandPos37);
      expect(lifted).not.toBeNull();
      expect(lifted?.chr).toBe('1');
      expect(lifted?.pos).toBe(expectedPos38);
      expect(lifted?.strand).toBe('-');
    });

    it('correctly complements alleles on minus strand mapping', () => {
      expect(complementAllele('A')).toBe('T');
      expect(complementAllele('T')).toBe('A');
      expect(complementAllele('C')).toBe('G');
      expect(complementAllele('G')).toBe('C');
      // InDel tokens and no-calls must be unaffected
      expect(complementAllele('I')).toBe('I');
      expect(complementAllele('D')).toBe('D');
      expect(complementAllele('0')).toBe('0');
      expect(complementAllele('-')).toBe('-');
    });

    it('reverse complements and sorts heterozygous calls', () => {
      // A and C complemented becomes T and G; sorted alphabetically -> G and T
      const comp = complementGenotype('A', 'C');
      expect(comp.a1).toBe('G');
      expect(comp.a2).toBe('T');
    });

    it('lifts SNP list with minus-strand allele complementation', () => {
      const inputSnps: ParsedLocus[] = [
        {
          rsid: 'test_minus_snp',
          chr: '1',
          pos: minusStrandPos37,
          a1: 'A',
          a2: 'C',
          isValid: true,
        },
      ];

      const res = liftSnpList(inputSnps, chain19to38);
      expect(res.remappedCount).toBe(1);
      expect(res.droppedCount).toBe(0);
      expect(res.liftedSNPs[0].pos).toBe(expectedPos38);
      expect(res.liftedSNPs[0].a1).toBe('G');
      expect(res.liftedSNPs[0].a2).toBe('T');
    });
  });

  describe('Chromosome MT Normalization', () => {
    it('handles MT <-> chrM mapping across builds', () => {
      // rCRS position 500 in hg19 lifts to 498 in hg38 due to indels in D-loop
      const lifted = liftCoordinate(chain19to38, 'MT', 500);
      expect(lifted).not.toBeNull();
      expect(lifted?.chr).toBe('MT');
      expect(lifted?.pos).toBe(498);

      const reverseLifted = liftCoordinate(chain38to19, 'MT', 498);
      expect(reverseLifted).not.toBeNull();
      expect(reverseLifted?.chr).toBe('MT');
      expect(reverseLifted?.pos).toBe(500);
    });
  });

  describe('Unmappable Loci Dropping & Counting', () => {
    it('drops and counts unmappable or out-of-bounds positions', () => {
      const inputSnps: ParsedLocus[] = [
        {
          rsid: 'rs3094315',
          chr: '1',
          pos: 752566,
          a1: 'A',
          a2: 'G',
          isValid: true,
        },
        {
          rsid: 'unmappable_pos',
          chr: '1',
          pos: 999999999, // Out of bounds on chr1
          a1: 'C',
          a2: 'T',
          isValid: true,
        },
        {
          rsid: 'unknown_chr',
          chr: 'UNK',
          pos: 1000,
          a1: 'G',
          a2: 'G',
          isValid: true,
        },
      ];

      const res = liftSnpList(inputSnps, chain19to38);
      expect(res.remappedCount).toBe(1);
      expect(res.droppedCount).toBe(2);
      expect(res.liftedSNPs.length).toBe(1);
      expect(res.liftedSNPs[0].rsid).toBe('rs3094315');
      expect(res.liftedSNPs[0].pos).toBe(817186);
    });
  });
});
