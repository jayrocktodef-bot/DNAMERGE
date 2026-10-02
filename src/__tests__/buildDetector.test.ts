import { describe, it, expect } from 'vitest';
import { detectGenomeBuild, SENTINEL_SNPS } from '../services/buildDetector';

describe('Genome Build Detector', () => {
  it('detects GRCh37 with high confidence when sentinels match pos37', () => {
    const map = new Map<string, { chr: string; pos: number }>();
    for (const s of SENTINEL_SNPS) {
      map.set(s.rsid.toLowerCase(), { chr: s.chr, pos: s.pos37 });
    }

    const res = detectGenomeBuild(map);
    expect(res.build).toBe('GRCh37');
    expect(res.confidence).toBeGreaterThanOrEqual(0.7);
    expect(res.matches37).toBe(SENTINEL_SNPS.length);
    expect(res.matches38).toBe(0);
  });

  it('detects GRCh38 with high confidence when sentinels match pos38', () => {
    const map = new Map<string, { chr: string; pos: number }>();
    for (const s of SENTINEL_SNPS) {
      map.set(s.rsid.toLowerCase(), { chr: s.chr, pos: s.pos38 });
    }

    const res = detectGenomeBuild(map);
    expect(res.build).toBe('GRCh38');
    expect(res.confidence).toBeGreaterThanOrEqual(0.7);
    expect(res.matches38).toBeGreaterThanOrEqual(17);
  });

  it('returns Unknown on weak evidence / tied sentinels (below 0.7 ratio threshold)', () => {
    // 2 sentinels matching 37 and 2 sentinels matching 38
    const map = new Map<string, { chr: string; pos: number }>();
    map.set('rs3094315', { chr: '1', pos: 752566 }); // 37
    map.set('rs2980300', { chr: '1', pos: 785989 }); // 37
    map.set('rs2298217', { chr: '1', pos: 1113905 }); // 38
    map.set('rs2185539', { chr: '1', pos: 1220751 }); // 38

    const res = detectGenomeBuild(map);
    // Previously, this 2v2 tie fell through to 'GRCh37' at 0.5 confidence.
    // Fix 1a requires returning 'Unknown'.
    expect(res.build).toBe('Unknown');
    expect(res.testedSentinels).toBe(4);
    expect(res.matches37).toBe(2);
    expect(res.matches38).toBe(2);
    expect(res.confidence).toBe(0.5);
  });

  it('returns Unknown when no sentinels are tested', () => {
    const map = new Map<string, { chr: string; pos: number }>();
    map.set('rs9999999', { chr: '1', pos: 12345 });

    const res = detectGenomeBuild(map);
    expect(res.build).toBe('Unknown');
    expect(res.confidence).toBe(0);
    expect(res.testedSentinels).toBe(0);
  });
});
