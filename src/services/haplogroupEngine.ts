import {
  ALL_HAPLOGROUP_DEFINING_SNPS,
  Y_DNA_TREE,
  MT_DNA_TREE,
} from '../data/haplogroupReference';
import type {
  EvaluatedMarker,
  HaplogroupComparison,
  HaplogroupDefinition,
  HaplogroupSummary,
  LineageAnalysis,
  LineageType,
  MarkerStatus,
} from '../types/haplogroup';

interface LocusCall {
  a1: string;
  a2: string;
  isValid: boolean;
}

export class HaplogroupEngine {
  /**
   * Evaluates SNPs against defining markers for Y-DNA or mtDNA
   */
  public static evaluateDataset(
    snpMap: Map<string, LocusCall>,
    rsidMap?: Map<string, LocusCall>
  ): EvaluatedMarker[] {
    const results: EvaluatedMarker[] = [];

    for (let i = 0; i < ALL_HAPLOGROUP_DEFINING_SNPS.length; i++) {
      const snp = ALL_HAPLOGROUP_DEFINING_SNPS[i];
      const posKey = `${snp.chromosome.toUpperCase()}:${snp.position}`;
      const rsidKey = snp.rsid.toLowerCase();

      let call = snpMap.get(posKey);
      if (!call && rsidMap) {
        call = rsidMap.get(rsidKey);
      }

      let userGenotype = '--';
      let status: MarkerStatus = 'NO_CALL';
      let details = 'Marker uncalled or missing in raw data.';

      if (call && call.isValid) {
        // Form genotype string (e.g. "C", "CC", "CT")
        userGenotype = call.a1 === call.a2 ? call.a1 : `${call.a1}${call.a2}`;
        const derived = snp.derivedAllele.toUpperCase();
        const ancestral = snp.ancestralAllele.toUpperCase();

        if (userGenotype.includes(derived)) {
          status = 'POSITIVE_DERIVED';
          details = `Derived mutation detected (${derived}). Diagnostic for clade ${snp.haplogroup}.`;
        } else if (userGenotype.includes(ancestral)) {
          status = 'NEGATIVE_ANCESTRAL';
          details = `Ancestral base observed (${ancestral}). Unmutated.`;
        } else {
          status = 'MISMATCH';
          details = `Observed allele '${userGenotype}' differs from expected ancestral (${ancestral}) and derived (${derived}).`;
        }
      }

      // Mutation weight: Transversions get higher diagnostic confidence than transitions
      const weight = this.getMutationWeight(snp.ancestralAllele, snp.derivedAllele);

      results.push({
        snp,
        superKitGenotype: userGenotype,
        status,
        details,
        mutationWeight: weight,
      });
    }

    return results;
  }

  /**
   * Determines terminal haplogroup for either Paternal Y-DNA or Maternal mtDNA
   */
  public static classifyLineage(
    type: LineageType,
    evaluatedMarkers: EvaluatedMarker[]
  ): LineageAnalysis | null {
    const tree = type === 'PATERNAL_YDNA' ? Y_DNA_TREE : MT_DNA_TREE;
    const markers = evaluatedMarkers.filter((m) => m.snp.lineageType === type);

    const positiveDerived = markers.filter((m) => m.status === 'POSITIVE_DERIVED');
    const negativeAncestral = markers.filter((m) => m.status === 'NEGATIVE_ANCESTRAL');

    // For Y-DNA, if no derived markers are found and total calls are near zero, sample may be female
    if (type === 'PATERNAL_YDNA' && positiveDerived.length === 0) {
      return null;
    }

    // Set of ancestral negative clades to prevent false downstream child classification
    const negativeClades = new Set<string>();
    for (let i = 0; i < negativeAncestral.length; i++) {
      negativeClades.add(negativeAncestral[i].snp.haplogroup.toLowerCase());
    }

    interface ScoredHaplo {
      haplo: HaplogroupDefinition;
      positives: number;
      weightedScore: number;
      negatives: number;
      depth: number;
      hasConflict: boolean;
    }

    const scored: ScoredHaplo[] = [];

    for (let i = 0; i < tree.length; i++) {
      const h = tree[i];
      const hCodeLower = h.code.toLowerCase();

      // Find markers mapped to this haplogroup by name or code
      const matchingMarkers = markers.filter((m) => {
        const mHaplo = m.snp.haplogroup.toLowerCase();
        const mName = m.snp.name.toLowerCase();
        return (
          mHaplo === hCodeLower ||
          h.definingSnps.some((s) => s.toLowerCase() === mName || s.toLowerCase() === mHaplo)
        );
      });

      const pos = matchingMarkers.filter((m) => m.status === 'POSITIVE_DERIVED').length;
      const neg = matchingMarkers.filter((m) => m.status === 'NEGATIVE_ANCESTRAL').length;
      const weightedScore = matchingMarkers
        .filter((m) => m.status === 'POSITIVE_DERIVED')
        .reduce((sum, m) => sum + (m.mutationWeight || 1.0), 0);

      const path = this.buildLineagePath(h, tree);
      // Ancestral conflict: an upstream parent is negatively confirmed ancestral
      const hasConflict = path.some(
        (p) => negativeClades.has(p.code.toLowerCase()) && p.code.toLowerCase() !== hCodeLower
      );

      // Accumulate positive markers along the full phylogenetic path from root to this clade
      let pathPositives = 0;
      let pathWeightedScore = 0;
      for (const step of path) {
        const stepMarkers = markers.filter((m) => {
          const mHaplo = m.snp.haplogroup.toLowerCase();
          const mName = m.snp.name.toLowerCase();
          return (
            mHaplo === step.code.toLowerCase() ||
            step.definingSnps.some((s) => s.toLowerCase() === mName || s.toLowerCase() === mHaplo)
          );
        });
        pathPositives += stepMarkers.filter((m) => m.status === 'POSITIVE_DERIVED').length;
        pathWeightedScore += stepMarkers
          .filter((m) => m.status === 'POSITIVE_DERIVED')
          .reduce((sum, m) => sum + (m.mutationWeight || 1.0), 0);
      }

      scored.push({
        haplo: h,
        positives: pathPositives > 0 ? pathPositives : pos,
        weightedScore: pathWeightedScore > 0 ? pathWeightedScore : weightedScore,
        negatives: neg,
        depth: path.length,
        hasConflict,
      });
    }

    // Filter to candidates where the specific clade (or immediate branch) has positive derived support and no conflict
    const validCandidates = scored.filter((s) => {
      // Must have at least 1 positive marker and no upstream ancestral conflict
      if (s.positives === 0 || s.hasConflict) return false;
      // Must have direct positive marker for this node or a direct child
      const directMarkers = markers.filter((m) => {
        const mHaplo = m.snp.haplogroup.toLowerCase();
        const mName = m.snp.name.toLowerCase();
        return (
          mHaplo === s.haplo.code.toLowerCase() ||
          s.haplo.definingSnps.some((sn) => sn.toLowerCase() === mName || sn.toLowerCase() === mHaplo)
        );
      });
      return directMarkers.some((m) => m.status === 'POSITIVE_DERIVED');
    });

    validCandidates.sort((a, b) => {
      // 1. Deeper terminal subclade preferred (most specific clade on tree)
      if (b.depth !== a.depth) return b.depth - a.depth;
      // 2. Highest weighted positive support
      if (b.weightedScore !== a.weightedScore) return b.weightedScore - a.weightedScore;
      // 3. Fewer negative markers
      return a.negatives - b.negatives;
    });

    const best = validCandidates[0] || scored.find((s) => s.positives > 0) || scored[0];
    if (!best || (best.positives === 0 && type === 'PATERNAL_YDNA')) {
      return null;
    }

    const path = this.buildLineagePath(best.haplo, tree);

    // Calculate confidence score (50% - 99%)
    let confidence = 70;
    if (best.positives >= 3) confidence = 99;
    else if (best.positives === 2) confidence = 95;
    else if (best.positives === 1) confidence = 88;

    if (best.negatives > 0) {
      confidence = Math.max(50, confidence - best.negatives * 10);
    }

    return {
      lineageType: type,
      terminalHaplogroup: best.haplo,
      confidenceScore: confidence,
      positiveCount: positiveDerived.length,
      negativeCount: negativeAncestral.length,
      totalTestedMarkers: markers.length,
      lineageTreePath: path,
      evaluatedMarkers: markers,
    };
  }

  /**
   * Builds the complete phylogenetic path from tree root down to terminal node
   */
  public static buildLineagePath(
    terminal: HaplogroupDefinition,
    allHaplos: HaplogroupDefinition[]
  ): HaplogroupDefinition[] {
    const path: HaplogroupDefinition[] = [];
    let current: HaplogroupDefinition | undefined = terminal;

    while (current) {
      path.unshift(current);
      if (!current.parentClade) break;
      const parentCode = current.parentClade.toLowerCase();
      current = allHaplos.find((h) => h.code.toLowerCase() === parentCode);
    }

    return path;
  }

  /**
   * Generates a complete HaplogroupSummary for a set of SNPs
   */
  public static summarizeHaplogroups(
    snpMap: Map<string, LocusCall>,
    rsidMap?: Map<string, LocusCall>,
    totalYCount = 0,
    totalMtCount = 0
  ): HaplogroupSummary {
    const evaluated = this.evaluateDataset(snpMap, rsidMap);
    const yDna = this.classifyLineage('PATERNAL_YDNA', evaluated);
    const mtDna = this.classifyLineage('MATERNAL_MTDNA', evaluated);

    const isMale = Boolean(yDna && yDna.positiveCount > 0);

    return {
      yDna,
      mtDna,
      isMale,
      yCount: totalYCount,
      mtCount: totalMtCount,
    };
  }

  /**
   * Compares Kit 1 vs Kit 2 vs SuperKit to highlight resolution upgrades and diagnostic synergy
   */
  public static compareLineages(
    k1Summary: HaplogroupSummary,
    k2Summary: HaplogroupSummary,
    superSummary: HaplogroupSummary,
    k1Markers: EvaluatedMarker[],
    k2Markers: EvaluatedMarker[],
    superMarkers: EvaluatedMarker[]
  ): HaplogroupComparison {
    let paternalUpgradeText: string | undefined;
    let maternalUpgradeText: string | undefined;
    let paternalCladesGained = 0;
    let maternalCladesGained = 0;

    // Paternal Comparison
    const superY = superSummary.yDna;
    const k1Y = k1Summary.yDna;
    const k2Y = k2Summary.yDna;

    if (superY) {
      const bestPrior = (k1Y && k2Y)
        ? (k1Y.lineageTreePath.length >= k2Y.lineageTreePath.length ? k1Y : k2Y)
        : (k1Y || k2Y);

      if (bestPrior && superY.terminalHaplogroup.code !== bestPrior.terminalHaplogroup.code) {
        const cladesGained = Math.max(0, superY.lineageTreePath.length - bestPrior.lineageTreePath.length);
        paternalCladesGained = cladesGained;
        paternalUpgradeText = `Upgraded from ${bestPrior.terminalHaplogroup.shortName} to ${superY.terminalHaplogroup.shortName} (+${cladesGained} subclade tiers deeper)`;
      } else if (!bestPrior && superY) {
        paternalUpgradeText = `Resolved terminal ${superY.terminalHaplogroup.shortName} (${superY.terminalHaplogroup.cladeName})`;
      }
    }

    // Maternal Comparison
    const superMt = superSummary.mtDna;
    const k1Mt = k1Summary.mtDna;
    const k2Mt = k2Summary.mtDna;

    if (superMt) {
      const bestPriorMt = (k1Mt && k2Mt)
        ? (k1Mt.lineageTreePath.length >= k2Mt.lineageTreePath.length ? k1Mt : k2Mt)
        : (k1Mt || k2Mt);

      if (bestPriorMt && superMt.terminalHaplogroup.code !== bestPriorMt.terminalHaplogroup.code) {
        const cladesGained = Math.max(0, superMt.lineageTreePath.length - bestPriorMt.lineageTreePath.length);
        maternalCladesGained = cladesGained;
        maternalUpgradeText = `Upgraded from ${bestPriorMt.terminalHaplogroup.shortName} to ${superMt.terminalHaplogroup.shortName} (+${cladesGained} subclade tiers deeper)`;
      } else if (!bestPriorMt && superMt) {
        maternalUpgradeText = `Resolved maternal ${superMt.terminalHaplogroup.shortName}`;
      }
    }

    // Calculate Synergy: markers uncalled in Kit 1 or Kit 2 that were resolved in SuperKit
    let yDnaSynergyCount = 0;
    let mtDnaSynergyCount = 0;

    const mergedEvaluated: EvaluatedMarker[] = [];

    for (let i = 0; i < superMarkers.length; i++) {
      const s = superMarkers[i];
      const m1 = k1Markers.find((m) => m.snp.name === s.snp.name);
      const m2 = k2Markers.find((m) => m.snp.name === s.snp.name);

      const k1Call = m1 ? m1.superKitGenotype : '--';
      const k2Call = m2 ? m2.superKitGenotype : '--';

      const wasMissingInOne = (k1Call === '--' || k1Call === '00' || k1Call === '0') !==
                              (k2Call === '--' || k2Call === '00' || k2Call === '0');

      if (wasMissingInOne && s.status !== 'NO_CALL') {
        if (s.snp.lineageType === 'PATERNAL_YDNA') yDnaSynergyCount++;
        if (s.snp.lineageType === 'MATERNAL_MTDNA') mtDnaSynergyCount++;
      }

      mergedEvaluated.push({
        snp: s.snp,
        kit1Genotype: k1Call,
        kit2Genotype: k2Call,
        superKitGenotype: s.superKitGenotype,
        status: s.status,
        details: s.details,
        mutationWeight: s.mutationWeight,
      });
    }

    return {
      paternalUpgradeText,
      maternalUpgradeText,
      paternalCladesGained,
      maternalCladesGained,
      yDnaSynergyCount,
      mtDnaSynergyCount,
      evaluatedMarkers: mergedEvaluated,
    };
  }

  private static getMutationWeight(ancestral: string, derived: string): number {
    const a = ancestral.toUpperCase();
    const d = derived.toUpperCase();
    // Transitions (A <-> G, C <-> T) are common
    if (
      (a === 'A' && d === 'G') ||
      (a === 'G' && d === 'A') ||
      (a === 'C' && d === 'T') ||
      (a === 'T' && d === 'C')
    ) {
      return 1.0;
    }
    // Rare Transversions receive higher diagnostic mutational weight
    return 4.0;
  }
}
