/**
 * Weighted Bayesian Consensus Engine
 * 
 * Arbitrates discordant genotype calls between overlapping kits based on
 * platform-specific error rates, empirical probe quality, and heterozygote dropout mechanics.
 */

export interface LocusObservation {
  a1: string;
  a2: string;
  isValid: boolean;
}

export interface ConsensusResult {
  a1: string;
  a2: string;
  isDiscordant: boolean;
  resolutionStrategy: 'CONCORDANT' | 'GAP_FILL' | 'HET_DROPOUT_RESCUE' | 'PLATFORM_WEIGHT' | 'USER_AUTHORITY' | 'NO_CALL';
  winningKit?: 'kit1' | 'kit2';
}

/**
 * Checks whether an unphased genotype is heterozygous (two distinct valid alleles).
 */
export function isHeterozygous(obs: LocusObservation): boolean {
  return obs.isValid && obs.a1 !== obs.a2 && obs.a1 !== '0' && obs.a2 !== '0';
}

/**
 * Resolves consensus between two kit observations at the same physical genomic locus.
 */
export function resolveLocusConsensus(
  k1: LocusObservation | undefined,
  k2: LocusObservation | undefined,
  w1: number,
  w2: number,
  mode: 'weighted_consensus' | 'kit1' | 'kit2' = 'weighted_consensus'
): ConsensusResult {
  // Case 1: Missing in one or both
  if (!k1 && !k2) {
    return { a1: '0', a2: '0', isDiscordant: false, resolutionStrategy: 'NO_CALL' };
  }
  if (k1 && !k2) {
    return {
      a1: k1.a1,
      a2: k1.a2,
      isDiscordant: false,
      resolutionStrategy: k1.isValid ? 'GAP_FILL' : 'NO_CALL',
      winningKit: 'kit1',
    };
  }
  if (!k1 && k2) {
    return {
      a1: k2.a1,
      a2: k2.a2,
      isDiscordant: false,
      resolutionStrategy: k2.isValid ? 'GAP_FILL' : 'NO_CALL',
      winningKit: 'kit2',
    };
  }

  const obs1 = k1!;
  const obs2 = k2!;

  // Case 2: One kit has a no-call (00 / --), the other has a valid call -> Gap-fill
  if (!obs1.isValid && obs2.isValid) {
    return { a1: obs2.a1, a2: obs2.a2, isDiscordant: false, resolutionStrategy: 'GAP_FILL', winningKit: 'kit2' };
  }
  if (obs1.isValid && !obs2.isValid) {
    return { a1: obs1.a1, a2: obs1.a2, isDiscordant: false, resolutionStrategy: 'GAP_FILL', winningKit: 'kit1' };
  }
  if (!obs1.isValid && !obs2.isValid) {
    return { a1: '0', a2: '0', isDiscordant: false, resolutionStrategy: 'NO_CALL' };
  }

  // Case 3: Both kits have valid calls. Check for genotype equality.
  // Direct match or reverse complement match
  const directMatch = obs1.a1 === obs2.a1 && obs1.a2 === obs2.a2;
  if (directMatch) {
    return { a1: obs1.a1, a2: obs1.a2, isDiscordant: false, resolutionStrategy: 'CONCORDANT' };
  }

  // Check reverse complement equivalence for non-ambiguous SNPs
  const isAmbiguous1 = (obs1.a1 === 'A' && obs1.a2 === 'T') || (obs1.a1 === 'C' && obs1.a2 === 'G');
  const isAmbiguous2 = (obs2.a1 === 'A' && obs2.a2 === 'T') || (obs2.a1 === 'C' && obs2.a2 === 'G');

  if (!isAmbiguous1 && !isAmbiguous2) {
    const compMap: Record<string, string> = { A: 'T', T: 'A', C: 'G', G: 'C' };
    const c2A1 = compMap[obs2.a1] || obs2.a1;
    const c2A2 = compMap[obs2.a2] || obs2.a2;
    const [sortedComp1, sortedComp2] = c2A1 <= c2A2 ? [c2A1, c2A2] : [c2A2, c2A1];

    if (obs1.a1 === sortedComp1 && obs1.a2 === sortedComp2) {
      // Concordant via strand flip! Prefer forward strand (Kit 1 representation)
      return { a1: obs1.a1, a2: obs1.a2, isDiscordant: false, resolutionStrategy: 'CONCORDANT' };
    }
  }

  // Case 4: Genuinely Discordant Call!
  if (mode === 'kit1') {
    return { a1: obs1.a1, a2: obs1.a2, isDiscordant: true, resolutionStrategy: 'USER_AUTHORITY', winningKit: 'kit1' };
  }
  if (mode === 'kit2') {
    return { a1: obs2.a1, a2: obs2.a2, isDiscordant: true, resolutionStrategy: 'USER_AUTHORITY', winningKit: 'kit2' };
  }

  // Weighted Consensus Mode:
  const het1 = isHeterozygous(obs1);
  const het2 = isHeterozygous(obs2);

  // Subcase A: Heterozygote vs Homozygote Conflict (Allelic Dropout Rescue)
  // In BeadArray technology, allelic dropout (failing to call one allele of a heterozygote) is ~100x more
  // prevalent than an erroneous false-positive heterozygote call.
  if (het1 && !het2) {
    // If Kit 1 observed both alleles with reasonable weight, rescue the heterozygote
    if (w1 >= 0.70) {
      return { a1: obs1.a1, a2: obs1.a2, isDiscordant: true, resolutionStrategy: 'HET_DROPOUT_RESCUE', winningKit: 'kit1' };
    }
  } else if (!het1 && het2) {
    if (w2 >= 0.70) {
      return { a1: obs2.a1, a2: obs2.a2, isDiscordant: true, resolutionStrategy: 'HET_DROPOUT_RESCUE', winningKit: 'kit2' };
    }
  }

  // Subcase B: Homozygote vs Homozygote or Both Heterozygous differing
  // Pick the call with the higher platform prior confidence weight
  if (w1 > w2) {
    return { a1: obs1.a1, a2: obs1.a2, isDiscordant: true, resolutionStrategy: 'PLATFORM_WEIGHT', winningKit: 'kit1' };
  } else if (w2 > w1) {
    return { a1: obs2.a1, a2: obs2.a2, isDiscordant: true, resolutionStrategy: 'PLATFORM_WEIGHT', winningKit: 'kit2' };
  }

  // Equal weights fallback: default to Kit 1
  return { a1: obs1.a1, a2: obs1.a2, isDiscordant: true, resolutionStrategy: 'PLATFORM_WEIGHT', winningKit: 'kit1' };
}
