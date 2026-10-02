import { describe, it, expect } from 'vitest';
import { executeMerge } from '../worker/superkitWorker';

describe('Cross-Build Liftover & SuperKit Merge Pipeline', () => {
  // Synthetic Kit 1 (AncestryDNA format, GRCh37 sentinels)
  const syntheticKit1_GRCh37 = [
    '# AncestryDNA raw data download',
    '# rsid\tchromosome\tposition\tallele1\tallele2',
    'rs3094315\t1\t752566\tA\tG',     // Sentinel pos37
    'rs2980300\t1\t785989\tC\tT',     // Sentinel pos37
    'rs2298217\t1\t1049285\tA\tA',    // Sentinel pos37
    'rs2185539\t1\t1156131\tG\tG',    // Sentinel pos37
    'rs11240777\t1\t1298972\tT\tT',   // Sentinel pos37
    'rs1801133\t1\t11856378\tG\tA',   // Sentinel pos37
    'rs1801131\t1\t11854476\tC\tC',   // Sentinel pos37
    'rs12913832\t15\t28365618\tA\tA', // Sentinel pos37
    'rs4680\t22\t19951271\tG\tA',     // Sentinel pos37
    'k1_unique_1\t1\t752567\tC\tT',   // Kit 1 unique in GRCh37
  ].join('\n');

  // Synthetic Kit 2 (23andMe format, GRCh38 sentinels + GRCh38 unique loci)
  const syntheticKit2_GRCh38 = [
    '# 23andMe raw data download',
    '# rsid\tchromosome\tposition\tgenotype',
    'rs3094315\t1\t817186\tAG',        // Sentinel pos38 (overlaps with Kit 1 pos37 752566!)
    'rs2980300\t1\t850609\tCT',        // Sentinel pos38 (overlaps with Kit 1 pos37 785989!)
    'rs2298217\t1\t1113905\tAA',       // Sentinel pos38
    'rs2185539\t1\t1220751\tGG',       // Sentinel pos38
    'rs11240777\t1\t1363592\tTT',      // Sentinel pos38
    'rs1801133\t1\t11796321\tGA',      // Sentinel pos38
    'rs1801131\t1\t11794419\tCC',      // Sentinel pos38
    'rs12913832\t15\t28120472\tAA',    // Sentinel pos38
    'rs4680\t22\t19963748\tGA',        // Sentinel pos38
    // Kit 2 unique locus on GRCh38: pos38 850610 (maps back to GRCh37 785990)
    'k2_unique_lifted\t1\t850610\tCC',
    // Kit 2 unmappable locus on invalid coordinate
    'k2_unmappable\t1\t999999999\tGG',
  ].join('\n');

  it('correctly lifts cross-build Kit 2 (GRCh38) to target build (GRCh37) without coordinate corruption', async () => {
    const result = await executeMerge({
      kit1Text: syntheticKit1_GRCh37,
      kit2Text: syntheticKit2_GRCh38,
      options: {
        primaryAuthority: 'weighted_consensus',
        outputFormat: 'ancestry',
        targetBuild: 'GRCh37',
      },
    });

    expect(result.kit1Build).toBe('GRCh37');
    expect(result.kit2Build).toBe('GRCh38');
    expect(result.targetBuild).toBe('GRCh37');

    // Liftover stats must be populated
    expect(result.liftoverStats).toBeDefined();
    expect(result.liftoverStats?.length).toBe(1);
    const stat = result.liftoverStats![0];
    expect(stat.kit).toBe('kit2');
    expect(stat.fromBuild).toBe('GRCh38');
    expect(stat.toBuild).toBe('GRCh37');
    expect(stat.remappedCount).toBe(10); // 9 sentinels + 1 unique lifted
    expect(stat.droppedCount).toBe(1);   // 1 unmappable dropped

    // Verify output text
    expect(result.outputBlob).toBeDefined();
    const outputText = await result.outputBlob!.text();

    // Emitted header must include Assembly and Liftover lines
    expect(outputText).toContain('# Assembly: GRCh37 (Source Kits: Kit 1 = GRCh37, Kit 2 = GRCh38)');
    expect(outputText).toContain('# Liftover: 10 loci remapped GRCh38 → GRCh37 (1 unmappable, dropped)');

    // Crucial correctness invariant:
    // Every single emitted position must be in GRCh37 coordinates!
    // rs3094315 MUST be at 752566 (GRCh37), NOT 817186 (GRCh38)
    expect(outputText).toContain('rs3094315\t1\t752566');
    expect(outputText).not.toContain('rs3094315\t1\t817186');

    // rs2980300 MUST be at 785989 (GRCh37), NOT 850609 (GRCh38)
    expect(outputText).toContain('rs2980300\t1\t785989');
    expect(outputText).not.toContain('rs2980300\t1\t850609');

    // The kit-2-unique SNP must have been remapped to GRCh37 (785990), NOT kept at 850610
    expect(outputText).toContain('k2_unique_lifted\t1\t785990');
    expect(outputText).not.toContain('k2_unique_lifted\t1\t850610');

    // Unmappable locus must have been dropped
    expect(outputText).not.toContain('k2_unmappable');

    // Overlapping sentinels should be concordant and deduplicated
    expect(result.overlappingCount).toBeGreaterThanOrEqual(9);
  });

  it('refuses the merge with an actionable error when build detection yields Unknown and no manual override is set', async () => {
    // Synthetic ambiguous kit with 2 matches for GRCh37 and 2 matches for GRCh38
    const ambiguousKit = [
      '# Ambiguous kit',
      '# rsid\tchromosome\tposition\tallele1\tallele2',
      'rs3094315\t1\t752566\tA\tG',    // 37
      'rs2980300\t1\t785989\tC\tT',    // 37
      'rs2298217\t1\t1113905\tA\tA',   // 38
      'rs2185539\t1\t1220751\tG\tG',   // 38
    ].join('\n');

    await expect(
      executeMerge({
        kit1Text: ambiguousKit,
        kit2Text: syntheticKit1_GRCh37,
        options: {
          primaryAuthority: 'weighted_consensus',
          outputFormat: 'ancestry',
          targetBuild: 'GRCh37',
          kit1BuildOverride: 'auto',
        },
      })
    ).rejects.toThrow(/Kit 1 build could not be determined with confidence/);
  });

  it('allows merge when user manually overrides the build for an ambiguous kit', async () => {
    const ambiguousKit = [
      '# Ambiguous kit',
      '# rsid\tchromosome\tposition\tallele1\tallele2',
      'rs3094315\t1\t752566\tA\tG',
      'rs2980300\t1\t785989\tC\tT',
      'rs2298217\t1\t1113905\tA\tA',
      'rs2185539\t1\t1220751\tG\tG',
    ].join('\n');

    // Manual override set to GRCh37 -> merge should succeed!
    const result = await executeMerge({
      kit1Text: ambiguousKit,
      kit2Text: syntheticKit1_GRCh37,
      options: {
        primaryAuthority: 'weighted_consensus',
        outputFormat: 'ancestry',
        targetBuild: 'GRCh37',
        kit1BuildOverride: 'GRCh37',
      },
    });

    expect(result.kit1Build).toBe('GRCh37');
    expect(result.totalSuperKitCount).toBeGreaterThan(0);
  });

  it('regression anchor: same-build merge does not trigger liftover and behaves identically', async () => {
    const result = await executeMerge({
      kit1Text: syntheticKit1_GRCh37,
      kit2Text: syntheticKit1_GRCh37,
      options: {
        primaryAuthority: 'weighted_consensus',
        outputFormat: 'ancestry',
        targetBuild: 'GRCh37',
      },
    });

    // When builds match target, liftoverStats is empty
    expect(result.liftoverStats).toBeDefined();
    expect(result.liftoverStats?.length).toBe(0);

    const text = await result.outputBlob!.text();
    expect(text).not.toContain('# Liftover:');
    expect(result.concordanceRate).toBe(100);
    expect(result.overlappingCount).toBe(10);
  });
});
