import type {
  CanonicalSNP,
  ChromosomeCount,
  MergeOptions,
  WorkerErrorMessage,
  WorkerProgressMessage,
  WorkerSuccessMessage,
} from '../types/dna';
import { HaplogroupEngine } from '../services/haplogroupEngine';

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

  // Alphabetically sort unphased heterozygous calls (e.g. "G A" -> "A G")
  if (clean1 > clean2) {
    const tmp = clean1;
    clean1 = clean2;
    clean2 = tmp;
  }

  return { a1: clean1, a2: clean2, isValid: true };
}

// Complement map for DNA strands
const COMPLEMENT: Record<string, string> = {
  A: 'T',
  T: 'A',
  C: 'G',
  G: 'C',
  I: 'I',
  D: 'D',
  '0': '0',
};

// Check if two genotypes are identical (either direct or reverse complement for non-ambiguous SNPs)
function areGenotypesEqual(c1: { a1: string; a2: string }, c2: { a1: string; a2: string }): boolean {
  // Direct match (already canonical sorted in normalizeAlleles)
  if (c1.a1 === c2.a1 && c1.a2 === c2.a2) return true;

  // Reverse strand complement match check for non-ambiguous SNPs (e.g. A/A vs T/T or A/C vs T/G)
  const isAmbiguous1 = (c1.a1 === 'A' && c1.a2 === 'T') || (c1.a1 === 'C' && c1.a2 === 'G');
  const isAmbiguous2 = (c2.a1 === 'A' && c2.a2 === 'T') || (c2.a1 === 'C' && c2.a2 === 'G');

  if (!isAmbiguous1 && !isAmbiguous2) {
    const compA1 = COMPLEMENT[c2.a1] || c2.a1;
    const compA2 = COMPLEMENT[c2.a2] || c2.a2;
    // Canonical sort complement pair
    const [cComp1, cComp2] = compA1 <= compA2 ? [compA1, compA2] : [compA2, compA1];
    if (c1.a1 === cComp1 && c1.a2 === cComp2) {
      return true;
    }
  }

  return false;
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
    // STAGE 3: Deduplication & Conflict Resolution on (chr, pos)
    // -------------------------------------------------------------
    postProgress('merging', 3, 50, 'Deduplicating loci on (chr, pos) coordinates and resolving conflicts...');

    interface LocusRecord {
      rsid: string;
      chr: string;
      pos: number;
      kit1?: { a1: string; a2: string; isValid: boolean; rsid: string };
      kit2?: { a1: string; a2: string; isValid: boolean; rsid: string };
    }

    const locusMap = new Map<string, LocusRecord>();

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
    }

    let overlappingCount = 0;
    let gapFilledCount = 0;
    let discordantCount = 0;
    let uniqueKit2Count = 0;

    // Add Kit 2 loci and resolve conflicts
    for (let i = 0; i < kit2SNPs.length; i++) {
      const snp = kit2SNPs[i];
      const key = `${snp.chr}:${snp.pos}`;
      const existing = locusMap.get(key);

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
      }
    }

    const uniqueKit1Count = kit1SNPs.length - overlappingCount;
    postProgress('merging', 3, 70, `Merged ${locusMap.size.toLocaleString()} unique genomic loci.`);

    // -------------------------------------------------------------
    // STAGE 4: Sorting by Coordinate (Chr 1..22, X, Y, MT, Ascending Pos)
    // -------------------------------------------------------------
    postProgress('sorting', 4, 75, 'Sorting SuperKit sequentially by chromosome and numeric position...');

    const finalSNPs: CanonicalSNP[] = [];

    locusMap.forEach((rec) => {
      let finalA1 = '0';
      let finalA2 = '0';

      const k1 = rec.kit1;
      const k2 = rec.kit2;

      if (k1 && !k2) {
        finalA1 = k1.a1;
        finalA2 = k1.a2;
      } else if (!k1 && k2) {
        finalA1 = k2.a1;
        finalA2 = k2.a2;
      } else if (k1 && k2) {
        if (!k1.isValid && k2.isValid) {
          finalA1 = k2.a1;
          finalA2 = k2.a2;
          gapFilledCount++;
        } else if (k1.isValid && !k2.isValid) {
          finalA1 = k1.a1;
          finalA2 = k1.a2;
          gapFilledCount++;
        } else if (!k1.isValid && !k2.isValid) {
          finalA1 = '0';
          finalA2 = '0';
        } else {
          // Check genotype equivalence (including unphased ordering and reverse strand complement)
          if (areGenotypesEqual(k1, k2)) {
            finalA1 = k1.a1;
            finalA2 = k1.a2;
          } else {
            // Discordant Call! Apply Primary Authority rule
            discordantCount++;
            if (options.primaryAuthority === 'kit1') {
              finalA1 = k1.a1;
              finalA2 = k1.a2;
            } else {
              finalA1 = k2.a1;
              finalA2 = k2.a2;
            }
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
      headerLines.push('# Build Reference: GRCh37 (hg19)');
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
      headerLines.push('# Assembly: GRCh37');
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
