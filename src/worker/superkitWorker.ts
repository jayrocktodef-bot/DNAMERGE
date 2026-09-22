import type {
  CanonicalSNP,
  ChromosomeCount,
  MergeOptions,
  WorkerErrorMessage,
  WorkerProgressMessage,
  WorkerSuccessMessage,
} from '../types/dna';
import { HaplogroupEngine } from '../services/haplogroupEngine';
import { detectGenomeBuild, inferPlatformProfile } from '../services/buildDetector';
import { resolveLocusConsensus } from '../services/consensusEngine';
import { inferBiologicalSex, sanitizeHemizygousLocus } from '../services/sexInferrer';
import { harmonizeIndelAlleles } from '../services/indelHarmonizer';

// Web Worker context scope declaration
const ctx: Worker = self as unknown as Worker;

interface ParsedSNP {
  rsid: string;
  chr: string;
  pos: number;
  a1: string;
  a2: string;
  isValid: boolean;
}

// Map chromosome label to standardized string & sort rank
function normalizeChromosome(rawChr: string): { chr: string; orderRank: number } {
  let clean = rawChr.trim().toUpperCase().replace(/^CHR/, '');
  
  if (clean === '23' || clean === 'X' || clean === 'PAR' || clean === 'XY') {
    return { chr: 'X', orderRank: 23 };
  }
  if (clean === '24' || clean === 'Y') {
    return { chr: 'Y', orderRank: 24 };
  }
  if (clean === '25' || clean === '26' || clean === 'M' || clean === 'MT') {
    return { chr: 'MT', orderRank: 25 };
  }
  
  const num = parseInt(clean, 10);
  if (!isNaN(num) && num >= 1 && num <= 22) {
    return { chr: String(num), orderRank: num };
  }

  return { chr: clean || 'UNK', orderRank: 99 };
}

// Normalize alleles to uppercase standard bases or '0' for no-call
function normalizeAlleles(raw1: string, raw2?: string): { a1: string; a2: string; isValid: boolean } {
  let clean1 = (raw1 || '').trim().toUpperCase().replace(/["']/g, '');
  let clean2 = (raw2 || '').trim().toUpperCase().replace(/["']/g, '');

  // If single string provided (e.g. 23andMe "AG" or "A")
  if (!raw2 && clean1.length > 1) {
    clean2 = clean1.substring(1, 2);
    clean1 = clean1.substring(0, 1);
  } else if (!raw2 && clean1.length === 1) {
    clean2 = clean1; // Hemizygous call on X/Y/MT
  }

  const invalidTokens = new Set(['0', '00', '--', '??', 'NN', '-', '0/0', './.', 'N', '?', '']);

  const isNoCall1 = invalidTokens.has(clean1);
  const isNoCall2 = invalidTokens.has(clean2);

  if (isNoCall1 || isNoCall2) {
    return { a1: '0', a2: '0', isValid: false };
  }

  // Harmonize structural variant / InDel notations ('I'/'D' vs multi-base sequences)
  const indelResult = harmonizeIndelAlleles(clean1, clean2);
  clean1 = indelResult.a1;
  clean2 = indelResult.a2;

  // Alphabetically sort unphased heterozygous calls (e.g. "G A" -> "A G")
  if (clean1 > clean2) {
    const tmp = clean1;
    clean1 = clean2;
    clean2 = tmp;
  }

  return { a1: clean1, a2: clean2, isValid: true };
}

// Parse text block line by line into ParsedSNP list
// Helper to split a line by delimiter and strip quotes/whitespace
function splitLineFields(line: string, delimiter: string): string[] {
  if (delimiter === ',') {
    const raw = line.split(',');
    return raw.map((f) => f.trim().replace(/^["']|["']$/g, ''));
  }
  if (delimiter === '\t') {
    const raw = line.split(/\t+/);
    return raw.map((f) => f.trim().replace(/^["']|["']$/g, ''));
  }
  if (delimiter === ';') {
    const raw = line.split(';');
    return raw.map((f) => f.trim().replace(/^["']|["']$/g, ''));
  }
  const raw = line.split(/\s+/);
  return raw.map((f) => f.trim().replace(/^["']|["']$/g, ''));
}

// Auto-detect delimiter from non-comment lines
function detectDelimiter(sampleLines: string[]): string {
  let commaScore = 0;
  let tabScore = 0;
  let semiScore = 0;

  for (let i = 0; i < Math.min(30, sampleLines.length); i++) {
    const l = sampleLines[i].trim();
    if (!l || l.startsWith('#') || l.startsWith('[') || l.startsWith('//')) continue;
    if (l.includes(',')) commaScore += (l.match(/,/g) || []).length;
    if (l.includes('\t')) tabScore += (l.match(/\t/g) || []).length;
    if (l.includes(';')) semiScore += (l.match(/;/g) || []).length;
  }

  if (commaScore > tabScore && commaScore > semiScore) return ',';
  if (semiScore > tabScore && semiScore > commaScore) return ';';
  return '\t'; // Default to tab / whitespace
}

// Parse text block line by line into ParsedSNP list
function parseRawDnaText(
  text: string,
  onProgress?: (linesProcessed: number) => void
): ParsedSNP[] {
  // Strip UTF-8 BOM if present
  const cleanText = text.replace(/^\uFEFF/, '');
  const lines = cleanText.split(/\r?\n/);
  const snps: ParsedSNP[] = [];

  const delimiter = detectDelimiter(lines);

  let rsidCol = -1;
  let chrCol = -1;
  let posCol = -1;
  let allele1Col = -1;
  let allele2Col = -1;
  let isSingleResultCol = false;
  let headerFound = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#') || line.startsWith('[') || line.startsWith('//')) continue;

    // Detect format headers
    if (!headerFound) {
      const lower = line.toLowerCase();
      if (
        lower.includes('rsid') ||
        lower.includes('chromosome') ||
        lower.includes('position') ||
        lower.includes('snp') ||
        lower.includes('result') ||
        lower.includes('genotype')
      ) {
        const cols = splitLineFields(line, delimiter).map((c) => c.toLowerCase());

        rsidCol = cols.findIndex((c) => c.includes('rsid') || c.includes('snp') || c.includes('id') || c === 'name');
        chrCol = cols.findIndex((c) => c.includes('chromosome') || c.includes('chr'));
        posCol = cols.findIndex((c) => c.includes('position') || c.includes('pos') || c.includes('coord'));

        const resultIdx = cols.findIndex((c) => c.includes('result') || c.includes('genotype') || c === 'call' || c === 'gt');
        if (resultIdx !== -1) {
          isSingleResultCol = true;
          allele1Col = resultIdx;
        } else {
          allele1Col = cols.findIndex((c) => c.includes('allele1') || c.includes('allele 1') || c === 'a1');
          allele2Col = cols.findIndex((c) => c.includes('allele2') || c.includes('allele 2') || c === 'a2');
        }

        // Fallbacks for standard indexes if not matching exact words
        if (rsidCol === -1) rsidCol = 0;
        if (chrCol === -1) chrCol = 1;
        if (posCol === -1) posCol = 2;
        if (allele1Col === -1) allele1Col = 3;
        if (allele2Col === -1) allele2Col = 4;

        headerFound = true;
        continue;
      }
    }

    // Parse fields
    const fields = splitLineFields(line, delimiter);
    if (fields.length < 3) continue;

    const rIdx = rsidCol >= 0 ? rsidCol : 0;
    const cIdx = chrCol >= 0 ? chrCol : 1;
    const pIdx = posCol >= 0 ? posCol : 2;
    const a1Idx = allele1Col >= 0 ? allele1Col : 3;
    const a2Idx = allele2Col >= 0 ? allele2Col : 4;

    const rsid = fields[rIdx] || 'nocall';
    const rawChr = fields[cIdx] || '';
    const posStr = fields[pIdx] || '0';
    const pos = parseInt(posStr, 10);

    if (isNaN(pos) || pos <= 0) continue; // Skip headers or invalid position data

    const { chr } = normalizeChromosome(rawChr);

    let a1 = '0';
    let a2 = '0';
    let isValid = false;

    if (isSingleResultCol || a2Idx >= fields.length || a1Idx === a2Idx) {
      const rawGeno = fields[a1Idx] || '';
      const norm = normalizeAlleles(rawGeno);
      a1 = norm.a1;
      a2 = norm.a2;
      isValid = norm.isValid;
    } else {
      const rawA1 = fields[a1Idx] || '';
      const rawA2 = fields[a2Idx] || '';
      const norm = normalizeAlleles(rawA1, rawA2);
      a1 = norm.a1;
      a2 = norm.a2;
      isValid = norm.isValid;
    }

    snps.push({
      rsid,
      chr,
      pos,
      a1,
      a2,
      isValid,
    });

    if (onProgress && i % 100000 === 0) {
      onProgress(i);
    }
  }

  return snps;
}

import { unzipSync, gunzipSync } from 'fflate';

function unpackBufferIfNeeded(buffer: ArrayBuffer, decoder: TextDecoder): string {
  const bytes = new Uint8Array(buffer);

  // Magic bytes: ZIP starts with PK\x03\x04 (0x50 0x4B 0x03 0x04)
  if (bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    const unzipped = unzipSync(bytes);
    const filename = Object.keys(unzipped).find(
      (f) => !f.startsWith('__MACOSX') && (f.endsWith('.txt') || f.endsWith('.csv') || f.endsWith('.tsv') || !f.includes('.'))
    ) || Object.keys(unzipped)[0];

    if (filename && unzipped[filename]) {
      return decoder.decode(unzipped[filename]);
    }
  }

  // Magic bytes: GZIP starts with 0x1F 0x8B
  if (bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
    const decompressed = gunzipSync(bytes);
    return decoder.decode(decompressed);
  }

  return decoder.decode(buffer);
}

// Main Web Worker message handler
ctx.onmessage = (event: MessageEvent) => {
  const startTime = performance.now();
  const { kit1Text, kit2Text, kit1Buffer, kit2Buffer, options } = event.data as {
    kit1Text?: string;
    kit2Text?: string;
    kit1Buffer?: ArrayBuffer;
    kit2Buffer?: ArrayBuffer;
    options: MergeOptions;
  };

  try {
    const textDecoder = new TextDecoder('utf-8');

    // Decode or unpack compressed buffers (.zip/.gz) automatically
    const k1Content = kit1Buffer ? unpackBufferIfNeeded(kit1Buffer, textDecoder) : kit1Text || '';
    const k2Content = kit2Buffer ? unpackBufferIfNeeded(kit2Buffer, textDecoder) : kit2Text || '';

    // -------------------------------------------------------------
    // STAGE 1: Parsing Kit 1
    // -------------------------------------------------------------
    postProgress('parsing_kit1', 1, 10, 'Parsing and normalizing Kit 1 raw genotyping data...');
    const kit1SNPs = parseRawDnaText(k1Content);
    postProgress('parsing_kit1', 1, 20, `Successfully parsed ${kit1SNPs.length.toLocaleString()} loci from Kit 1.`);

    // -------------------------------------------------------------
    // STAGE 2: Parsing Kit 2
    // -------------------------------------------------------------
    postProgress('parsing_kit2', 2, 30, 'Parsing and normalizing Kit 2 raw genotyping data...');
    const kit2SNPs = parseRawDnaText(k2Content);
    postProgress('parsing_kit2', 2, 40, `Successfully parsed ${kit2SNPs.length.toLocaleString()} loci from Kit 2.`);

    // -------------------------------------------------------------
    // STAGE 2.5: Build Detection & Platform Confidence Profiling
    // -------------------------------------------------------------
    postProgress('merging', 3, 45, 'Detecting genome builds (GRCh37/GRCh38) and platform quality profiles...');
    const k1RsidLocMap = new Map<string, { chr: string; pos: number }>();
    for (let i = 0; i < kit1SNPs.length; i++) {
      const s = kit1SNPs[i];
      if (s.rsid && s.rsid.startsWith('rs')) {
        k1RsidLocMap.set(s.rsid.toLowerCase(), { chr: s.chr, pos: s.pos });
      }
    }
    const k1BuildInfo = detectGenomeBuild(k1RsidLocMap);

    const k2RsidLocMap = new Map<string, { chr: string; pos: number }>();
    for (let i = 0; i < kit2SNPs.length; i++) {
      const s = kit2SNPs[i];
      if (s.rsid && s.rsid.startsWith('rs')) {
        k2RsidLocMap.set(s.rsid.toLowerCase(), { chr: s.chr, pos: s.pos });
      }
    }
    const k2BuildInfo = detectGenomeBuild(k2RsidLocMap);

    const platform1 = inferPlatformProfile(k1Content, kit1SNPs.length, k1BuildInfo.build);
    const platform2 = inferPlatformProfile(k2Content, kit2SNPs.length, k2BuildInfo.build);

    // -------------------------------------------------------------
    // STAGE 3: Deduplication, Cross-Build Alignment & Consensus
    // -------------------------------------------------------------
    postProgress('merging', 3, 50, `Merging loci [${platform1.name} + ${platform2.name}]...`);

    interface LocusRecord {
      rsid: string;
      chr: string;
      pos: number;
      kit1?: { a1: string; a2: string; isValid: boolean; rsid: string };
      kit2?: { a1: string; a2: string; isValid: boolean; rsid: string };
    }

    const locusMap = new Map<string, LocusRecord>();
    const rsidToKey = new Map<string, string>();

    // Add Kit 1 loci
    for (let i = 0; i < kit1SNPs.length; i++) {
      const snp = kit1SNPs[i];
      const key = `${snp.chr}:${snp.pos}`;
      locusMap.set(key, {
        rsid: snp.rsid,
        chr: snp.chr,
        pos: snp.pos,
        kit1: { a1: snp.a1, a2: snp.a2, isValid: snp.isValid, rsid: snp.rsid },
      });
      if (snp.rsid && snp.rsid.startsWith('rs')) {
        rsidToKey.set(snp.rsid.toLowerCase(), key);
      }
    }

    let overlappingCount = 0;
    let uniqueKit2Count = 0;

    // Add Kit 2 loci and match on (chr, pos) or cross-build rsID alias
    for (let i = 0; i < kit2SNPs.length; i++) {
      const snp = kit2SNPs[i];
      let key = `${snp.chr}:${snp.pos}`;
      let existing = locusMap.get(key);

      // Cross-build matching: if not found by coordinate, check if matching by standard rsID
      if (!existing && snp.rsid && snp.rsid.startsWith('rs')) {
        const mappedKey = rsidToKey.get(snp.rsid.toLowerCase());
        if (mappedKey) {
          existing = locusMap.get(mappedKey);
          if (existing) {
            key = mappedKey;
          }
        }
      }

      if (existing) {
        overlappingCount++;
        existing.kit2 = { a1: snp.a1, a2: snp.a2, isValid: snp.isValid, rsid: snp.rsid };

        // Prefer standard rsID over vendor internal i- / vg- IDs
        if (existing.rsid.startsWith('i') || existing.rsid.startsWith('vg')) {
          if (snp.rsid.startsWith('rs')) {
            existing.rsid = snp.rsid;
          }
        }
      } else {
        uniqueKit2Count++;
        locusMap.set(key, {
          rsid: snp.rsid,
          chr: snp.chr,
          pos: snp.pos,
          kit2: { a1: snp.a1, a2: snp.a2, isValid: snp.isValid, rsid: snp.rsid },
        });
        if (snp.rsid && snp.rsid.startsWith('rs')) {
          rsidToKey.set(snp.rsid.toLowerCase(), key);
        }
      }
    }

    const uniqueKit1Count = kit1SNPs.length - overlappingCount;
    postProgress('merging', 3, 70, `Merged ${locusMap.size.toLocaleString()} unique genomic loci.`);

    // -------------------------------------------------------------
    // STAGE 4: Weighted Consensus Arbitration, Sex Inference & Hemizygous QC
    // -------------------------------------------------------------
    postProgress('sorting', 4, 75, 'Inferring biological sex, applying Bayesian consensus & hemizygous QC...');

    // Collect Chr X and Chr Y loci for Biological Sex Inference
    const xSnps: Array<{ pos: number; a1: string; a2: string; isValid: boolean }> = [];
    let yCallCount = 0;

    locusMap.forEach((rec) => {
      if (rec.chr === 'X') {
        const obs = rec.kit1?.isValid ? rec.kit1 : rec.kit2;
        if (obs && obs.isValid) {
          xSnps.push({ pos: rec.pos, a1: obs.a1, a2: obs.a2, isValid: true });
        }
      } else if (rec.chr === 'Y') {
        if ((rec.kit1 && rec.kit1.isValid) || (rec.kit2 && rec.kit2.isValid)) {
          yCallCount++;
        }
      }
    });

    const sexResult = inferBiologicalSex(
      xSnps,
      yCallCount,
      (options.targetBuild as 'GRCh37' | 'GRCh38') || 'GRCh37'
    );

    const finalSNPs: CanonicalSNP[] = [];
    let gapFilledCount = 0;
    let discordantCount = 0;
    let concordantCount = 0;
    let totalOverlappingValid = 0;
    let autosomalHetCount = 0;
    let autosomalValidCount = 0;
    let hemizygousSanitizedCount = 0;
    let indelsHarmonizedCount = 0;

    locusMap.forEach((rec) => {
      const consensus = resolveLocusConsensus(
        rec.kit1,
        rec.kit2,
        platform1.baseWeight,
        platform2.baseWeight,
        options.primaryAuthority || 'weighted_consensus'
      );

      if (rec.kit1 && rec.kit2) {
        if (rec.kit1.isValid && rec.kit2.isValid) {
          totalOverlappingValid++;
          if (!consensus.isDiscordant) {
            concordantCount++;
          } else {
            discordantCount++;
          }
        } else if (!rec.kit1.isValid || !rec.kit2.isValid) {
          if (rec.kit1.isValid || rec.kit2.isValid) {
            gapFilledCount++;
          }
        }
      }

      let finalA1 = consensus.a1;
      let finalA2 = consensus.a2;

      // Track InDels
      if (finalA1 === 'I' || finalA1 === 'D' || finalA2 === 'I' || finalA2 === 'D') {
        indelsHarmonizedCount++;
      }

      // Enforce biological hemizygous constraints (Chr Y/MT and male non-PAR Chr X)
      const hemSanitize = sanitizeHemizygousLocus(
        rec.chr,
        rec.pos,
        finalA1,
        finalA2,
        sexResult.inferredSex,
        (options.targetBuild as 'GRCh37' | 'GRCh38') || 'GRCh37'
      );

      if (hemSanitize.wasSanitized) {
        finalA1 = hemSanitize.a1;
        finalA2 = hemSanitize.a2;
        hemizygousSanitizedCount++;
      }

      // Autosomal heterozygosity tracking
      const orderRank = normalizeChromosome(rec.chr).orderRank;
      if (orderRank >= 1 && orderRank <= 22) {
        if (finalA1 !== '0' && finalA2 !== '0') {
          autosomalValidCount++;
          if (finalA1 !== finalA2) {
            autosomalHetCount++;
          }
        }
      }

      finalSNPs.push({
        rsid: rec.rsid,
        chromosome: rec.chr,
        position: rec.pos,
        allele1: finalA1,
        allele2: finalA2,
      });
    });

    // Custom chromosome sorter
    finalSNPs.sort((a, b) => {
      const orderA = normalizeChromosome(a.chromosome).orderRank;
      const orderB = normalizeChromosome(b.chromosome).orderRank;

      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.position - b.position;
    });

    postProgress('sorting', 4, 85, 'Chromosome sorting complete.');

    // -------------------------------------------------------------
    // STAGE 4.5: Haplogroup Resolution & Lineage Synergy Analysis
    // -------------------------------------------------------------
    postProgress('sorting', 4, 88, 'Resolving Y-DNA and mtDNA haplogroup subclades and lineage synergy...');

    // Index SNPs for Kit 1
    const k1SnpMap = new Map<string, { a1: string; a2: string; isValid: boolean }>();
    const k1RsidMap = new Map<string, { a1: string; a2: string; isValid: boolean }>();
    let k1YCount = 0;
    let k1MtCount = 0;
    for (let i = 0; i < kit1SNPs.length; i++) {
      const s = kit1SNPs[i];
      if (s.chr === 'Y') k1YCount++;
      if (s.chr === 'MT') k1MtCount++;
      const val = { a1: s.a1, a2: s.a2, isValid: s.isValid };
      k1SnpMap.set(`${s.chr}:${s.pos}`, val);
      if (s.rsid) k1RsidMap.set(s.rsid.toLowerCase(), val);
    }

    // Index SNPs for Kit 2
    const k2SnpMap = new Map<string, { a1: string; a2: string; isValid: boolean }>();
    const k2RsidMap = new Map<string, { a1: string; a2: string; isValid: boolean }>();
    let k2YCount = 0;
    let k2MtCount = 0;
    for (let i = 0; i < kit2SNPs.length; i++) {
      const s = kit2SNPs[i];
      if (s.chr === 'Y') k2YCount++;
      if (s.chr === 'MT') k2MtCount++;
      const val = { a1: s.a1, a2: s.a2, isValid: s.isValid };
      k2SnpMap.set(`${s.chr}:${s.pos}`, val);
      if (s.rsid) k2RsidMap.set(s.rsid.toLowerCase(), val);
    }

    // Index SNPs for Merged SuperKit
    const superSnpMap = new Map<string, { a1: string; a2: string; isValid: boolean }>();
    const superRsidMap = new Map<string, { a1: string; a2: string; isValid: boolean }>();
    let superYCount = 0;
    let superMtCount = 0;
    for (let i = 0; i < finalSNPs.length; i++) {
      const s = finalSNPs[i];
      if (s.chromosome === 'Y') superYCount++;
      if (s.chromosome === 'MT') superMtCount++;
      const isValid = (s.allele1 !== '0' && s.allele1 !== '-') || (s.allele2 !== '0' && s.allele2 !== '-');
      const val = { a1: s.allele1, a2: s.allele2, isValid };
      superSnpMap.set(`${s.chromosome}:${s.position}`, val);
      if (s.rsid) superRsidMap.set(s.rsid.toLowerCase(), val);
    }

    const k1Markers = HaplogroupEngine.evaluateDataset(k1SnpMap, k1RsidMap);
    const k2Markers = HaplogroupEngine.evaluateDataset(k2SnpMap, k2RsidMap);
    const superMarkers = HaplogroupEngine.evaluateDataset(superSnpMap, superRsidMap);

    const kit1Haplogroups = HaplogroupEngine.summarizeHaplogroups(k1SnpMap, k1RsidMap, k1YCount, k1MtCount);
    const kit2Haplogroups = HaplogroupEngine.summarizeHaplogroups(k2SnpMap, k2RsidMap, k2YCount, k2MtCount);
    const superKitHaplogroups = HaplogroupEngine.summarizeHaplogroups(superSnpMap, superRsidMap, superYCount, superMtCount);

    const haplogroupComparison = HaplogroupEngine.compareLineages(
      kit1Haplogroups,
      kit2Haplogroups,
      superKitHaplogroups,
      k1Markers,
      k2Markers,
      superMarkers
    );

    const concordanceRate = totalOverlappingValid > 0
      ? Math.round((concordantCount / totalOverlappingValid) * 10000) / 100
      : 100;

    const heterozygosityRate = autosomalValidCount > 0
      ? Math.round((autosomalHetCount / autosomalValidCount) * 10000) / 100
      : 0;

    let donorMatchStatus: 'IDENTICAL_DONOR' | 'HIGH_CONCORDANCE' | 'SUSPECT_MISMATCH' | 'DIFFERENT_DONORS' = 'IDENTICAL_DONOR';
    if (totalOverlappingValid >= 500) {
      if (concordanceRate >= 99.0) {
        donorMatchStatus = 'IDENTICAL_DONOR';
      } else if (concordanceRate >= 94.0) {
        donorMatchStatus = 'HIGH_CONCORDANCE';
      } else if (concordanceRate >= 80.0) {
        donorMatchStatus = 'SUSPECT_MISMATCH';
      } else {
        donorMatchStatus = 'DIFFERENT_DONORS';
      }
    }

    const resolvedTargetBuild = options.targetBuild || 'GRCh37';

    // -------------------------------------------------------------
    // STAGE 5: Generating Output File in Chunked Blobs (No Heap Overflows)
    // -------------------------------------------------------------
    postProgress('generating_output', 5, 90, `Formatting export file as ${options.outputFormat.toUpperCase()} in chunked streams...`);

    const blobParts: Blob[] = [];
    const timestamp = new Date().toISOString();

    const headerLines: string[] = [];
    if (options.outputFormat === 'ancestry') {
      headerLines.push('# AncestryDNA Raw Data SuperKit Export');
      headerLines.push(`# Generated by DNA SuperKit Builder on ${timestamp}`);
      headerLines.push(`# Assembly: ${resolvedTargetBuild} (Source Kits: Kit 1 = ${k1BuildInfo.build}, Kit 2 = ${k2BuildInfo.build})`);
      headerLines.push(`# Consensus Engine: Weighted Bayesian Consensus (${platform1.name} [wt ${platform1.baseWeight}] + ${platform2.name} [wt ${platform2.baseWeight}])`);
      headerLines.push(`# Inferred Biological Sex: ${sexResult.inferredSex} (Chr X Het Rate: ${sexResult.xHetRate}%)`);
      headerLines.push(`# Quality Sanitations: ${hemizygousSanitizedCount.toLocaleString()} hemizygous loci sanitized | ${indelsHarmonizedCount.toLocaleString()} InDels harmonized`);
      headerLines.push(`# Donor Concordance Rate: ${concordanceRate}% (${donorMatchStatus.replace('_', ' ')})`);
      headerLines.push(`# Autosomal Heterozygosity: ${heterozygosityRate}%`);
      headerLines.push(`# Total SuperKit Loci: ${finalSNPs.length.toLocaleString()}`);
      if (superKitHaplogroups.yDna) {
        headerLines.push(`# Y-DNA Haplogroup: ${superKitHaplogroups.yDna.terminalHaplogroup.code} (${superKitHaplogroups.yDna.terminalHaplogroup.shortName}) [Confidence: ${superKitHaplogroups.yDna.confidenceScore}%, Clade: ${superKitHaplogroups.yDna.terminalHaplogroup.cladeName}]`);
        headerLines.push(`# Y-DNA Lineage Path: ${superKitHaplogroups.yDna.lineageTreePath.map(p => p.shortName).join(' -> ')}`);
      }
      if (superKitHaplogroups.mtDna) {
        headerLines.push(`# mtDNA Haplogroup: ${superKitHaplogroups.mtDna.terminalHaplogroup.code} (${superKitHaplogroups.mtDna.terminalHaplogroup.shortName}) [Confidence: ${superKitHaplogroups.mtDna.confidenceScore}%, Clade: ${superKitHaplogroups.mtDna.terminalHaplogroup.cladeName}]`);
        headerLines.push(`# mtDNA Lineage Path: ${superKitHaplogroups.mtDna.lineageTreePath.map(p => p.shortName).join(' -> ')}`);
      }
      if (haplogroupComparison.paternalUpgradeText) {
        headerLines.push(`# Patrilineal Resolution: ${haplogroupComparison.paternalUpgradeText}`);
      }
      if (haplogroupComparison.maternalUpgradeText) {
        headerLines.push(`# Matrilineal Resolution: ${haplogroupComparison.maternalUpgradeText}`);
      }
      headerLines.push(`# Chr Y Coverage: ${superYCount.toLocaleString()} loci | Chr MT Coverage: ${superMtCount.toLocaleString()} loci`);
      headerLines.push('# Format: rsid\tchromosome\tposition\tallele1\tallele2');
      headerLines.push('rsid\tchromosome\tposition\tallele1\tallele2');
    } else {
      headerLines.push('# 23andMe Raw Data SuperKit Export');
      headerLines.push(`# Generated by DNA SuperKit Builder on ${timestamp}`);
      headerLines.push(`# Assembly: ${resolvedTargetBuild} (Source Kits: Kit 1 = ${k1BuildInfo.build}, Kit 2 = ${k2BuildInfo.build})`);
      headerLines.push(`# Consensus Engine: Weighted Bayesian Consensus (${platform1.name} [wt ${platform1.baseWeight}] + ${platform2.name} [wt ${platform2.baseWeight}])`);
      headerLines.push(`# Inferred Biological Sex: ${sexResult.inferredSex} (Chr X Het Rate: ${sexResult.xHetRate}%)`);
      headerLines.push(`# Quality Sanitations: ${hemizygousSanitizedCount.toLocaleString()} hemizygous loci sanitized | ${indelsHarmonizedCount.toLocaleString()} InDels harmonized`);
      headerLines.push(`# Donor Concordance Rate: ${concordanceRate}% (${donorMatchStatus.replace('_', ' ')})`);
      headerLines.push(`# Autosomal Heterozygosity: ${heterozygosityRate}%`);
      headerLines.push(`# Total SuperKit Loci: ${finalSNPs.length.toLocaleString()}`);
      if (superKitHaplogroups.yDna) {
        headerLines.push(`# Y-DNA Haplogroup: ${superKitHaplogroups.yDna.terminalHaplogroup.code} (${superKitHaplogroups.yDna.terminalHaplogroup.shortName}) [Confidence: ${superKitHaplogroups.yDna.confidenceScore}%]`);
        headerLines.push(`# Y-DNA Lineage Path: ${superKitHaplogroups.yDna.lineageTreePath.map(p => p.shortName).join(' -> ')}`);
      }
      if (superKitHaplogroups.mtDna) {
        headerLines.push(`# mtDNA Haplogroup: ${superKitHaplogroups.mtDna.terminalHaplogroup.code} (${superKitHaplogroups.mtDna.terminalHaplogroup.shortName}) [Confidence: ${superKitHaplogroups.mtDna.confidenceScore}%]`);
        headerLines.push(`# mtDNA Lineage Path: ${superKitHaplogroups.mtDna.lineageTreePath.map(p => p.shortName).join(' -> ')}`);
      }
      if (haplogroupComparison.paternalUpgradeText) {
        headerLines.push(`# Patrilineal Resolution: ${haplogroupComparison.paternalUpgradeText}`);
      }
      if (haplogroupComparison.maternalUpgradeText) {
        headerLines.push(`# Matrilineal Resolution: ${haplogroupComparison.maternalUpgradeText}`);
      }
      headerLines.push(`# Chr Y Coverage: ${superYCount.toLocaleString()} loci | Chr MT Coverage: ${superMtCount.toLocaleString()} loci`);
      headerLines.push('# rsid\tchromosome\tposition\tgenotype');
    }

    blobParts.push(new Blob([headerLines.join('\n') + '\n']));

    const BATCH_SIZE = 25000;
    let currentBatch: string[] = [];
    const isAncestry = options.outputFormat === 'ancestry';

    for (let i = 0; i < finalSNPs.length; i++) {
      const s = finalSNPs[i];
      if (isAncestry) {
        currentBatch.push(`${s.rsid}\t${s.chromosome}\t${s.position}\t${s.allele1}\t${s.allele2}`);
      } else {
        // In 23andMe format, hemizygous genotypes on Chr Y and Chr MT are single letters
        let gt: string;
        if (s.chromosome === 'Y' || s.chromosome === 'MT') {
          if (s.allele1 === '0' || s.allele1 === '-' || !s.allele1) {
            gt = '--';
          } else {
            gt = s.allele1;
          }
        } else {
          if (s.allele1 === '0' && s.allele2 === '0') {
            gt = '--';
          } else {
            gt = `${s.allele1}${s.allele2}`;
          }
        }
        currentBatch.push(`${s.rsid}\t${s.chromosome}\t${s.position}\t${gt}`);
      }

      if (currentBatch.length >= BATCH_SIZE) {
        blobParts.push(new Blob([currentBatch.join('\n') + '\n']));
        currentBatch = []; // Flush memory
      }
    }

    if (currentBatch.length > 0) {
      blobParts.push(new Blob([currentBatch.join('\n')]));
      currentBatch = [];
    }

    const outputBlob = new Blob(blobParts, { type: 'text/plain;charset=utf-8' });

    // Compute Chromosome Distribution
    const chrCountMap = new Map<string, number>();
    for (let i = 0; i < finalSNPs.length; i++) {
      const c = finalSNPs[i].chromosome;
      chrCountMap.set(c, (chrCountMap.get(c) || 0) + 1);
    }

    const chromosomeDistribution: ChromosomeCount[] = Array.from(chrCountMap.entries())
      .map(([chr, count]) => ({ chr, count }))
      .sort((a, b) => normalizeChromosome(a.chr).orderRank - normalizeChromosome(b.chr).orderRank);

    const endTime = performance.now();
    const executionTimeMs = Math.round(endTime - startTime);

    const successMessage: WorkerSuccessMessage = {
      type: 'SUCCESS',
      totalKit1Count: kit1SNPs.length,
      totalKit2Count: kit2SNPs.length,
      overlappingCount,
      gapFilledCount,
      discordantCount,
      uniqueKit1Count,
      uniqueKit2Count,
      totalSuperKitCount: finalSNPs.length,
      outputFormat: options.outputFormat,
      outputBlob,
      previewRows: finalSNPs.slice(0, 100),
      chromosomeDistribution,
      executionTimeMs,
      concordanceRate,
      heterozygosityRate,
      donorMatchStatus,
      kit1Build: k1BuildInfo.build,
      kit2Build: k2BuildInfo.build,
      targetBuild: resolvedTargetBuild,
      inferredSex: sexResult.inferredSex,
      xHeterozygosityRate: sexResult.xHetRate,
      hemizygousSanitizedCount,
      indelsHarmonizedCount,
      kit1Haplogroups,
      kit2Haplogroups,
      superKitHaplogroups,
      haplogroupComparison,
    };

    postProgress('completed', 5, 100, 'SuperKit processing finished successfully!');
    ctx.postMessage(successMessage);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const errPayload: WorkerErrorMessage = {
      type: 'ERROR',
      error: errorMsg,
    };
    ctx.postMessage(errPayload);
  }
};

function postProgress(
  stage: WorkerProgressMessage['stage'],
  stageNumber: number,
  percentage: number,
  detailMessage: string
) {
  const msg: WorkerProgressMessage = {
    type: 'PROGRESS',
    stage,
    stageNumber,
    percentage,
    detailMessage,
  };
  ctx.postMessage(msg);
}
