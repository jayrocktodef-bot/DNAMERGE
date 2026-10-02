/**
 * UCSC Chain-Based Liftover Engine
 * 
 * Provides client-side genomic coordinate conversion between GRCh37 (hg19)
 * and GRCh38 (hg38) using UCSC chain files.
 * 
 * Key invariants:
 * 1. 0-based half-open chain intervals vs 1-based chip positions (pos0 = pos - 1, output = qPos0 + 1).
 * 2. Minus-strand conversion complements reference sequence and genotype alleles (A<->T, C<->G).
 * 3. Chromosome naming normalization (MT <-> chrM).
 * 4. Drop-and-count accounting for unmappable or gap-falling loci.
 */

import { gunzipSync } from 'fflate';

export interface ChainInterval {
  tStart: number; // 0-based
  tEnd: number;   // 0-based exclusive
  qStart: number; // 0-based
}

export interface AlignmentChain {
  score: number;
  tName: string;
  tStart: number;
  tEnd: number;
  qName: string;
  qSize: number;
  qStrand: '+' | '-';
  qStart: number;
  qEnd: number;
  intervals: ChainInterval[];
  starts: number[];
}

export interface ChainLookup {
  byChr: Map<string, AlignmentChain[]>;
}

export interface LiftedCoordinate {
  chr: string;
  pos: number; // 1-based
  strand: '+' | '-';
}

export interface ParsedLocus {
  rsid: string;
  chr: string;
  pos: number;
  a1: string;
  a2: string;
  isValid: boolean;
}

export interface LiftoverResult {
  liftedSNPs: ParsedLocus[];
  remappedCount: number;
  droppedCount: number;
}

/**
 * Binary search for rightmost interval whose tStart <= target.
 */
export function binarySearchInterval(starts: number[], target: number): number {
  let low = 0;
  let high = starts.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (starts[mid] <= target) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low - 1;
}

/**
 * Parses uncompressed UCSC chain file text into a high-performance ChainLookup index.
 */
export function parseChainText(chainText: string): ChainLookup {
  const lines = chainText.split('\n');
  const chains: AlignmentChain[] = [];

  let curr: AlignmentChain | null = null;
  let currT = 0;
  let currQ = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;

    if (line.startsWith('chain')) {
      const parts = line.split(/\s+/);
      // Format: chain score tName tSize tStrand tStart tEnd qName qSize qStrand qStart qEnd id
      const tStart = parseInt(parts[5], 10);
      const qStart = parseInt(parts[10], 10);
      curr = {
        score: parseInt(parts[1], 10),
        tName: parts[2],
        tStart,
        tEnd: parseInt(parts[6], 10),
        qName: parts[7],
        qSize: parseInt(parts[8], 10),
        qStrand: parts[9] === '-' ? '-' : '+',
        qStart,
        qEnd: parseInt(parts[11], 10),
        intervals: [],
        starts: [],
      };
      chains.push(curr);
      currT = tStart;
      currQ = qStart;
    } else if (curr) {
      const fields = line.split(/\s+/);
      const size = parseInt(fields[0], 10);
      if (isNaN(size)) continue;

      curr.intervals.push({
        tStart: currT,
        tEnd: currT + size,
        qStart: currQ,
      });

      currT += size;
      currQ += size;

      if (fields.length === 3) {
        const dt = parseInt(fields[1], 10);
        const dq = parseInt(fields[2], 10);
        currT += dt;
        currQ += dq;
      }
    }
  }

  const byChr = new Map<string, AlignmentChain[]>();
  for (let i = 0; i < chains.length; i++) {
    const c = chains[i];
    let list = byChr.get(c.tName);
    if (!list) {
      list = [];
      byChr.set(c.tName, list);
    }
    list.push(c);
  }

  for (const list of byChr.values()) {
    // Sort chains by score descending (highest confidence primary alignments first)
    list.sort((a, b) => b.score - a.score);
    for (let j = 0; j < list.length; j++) {
      const c = list[j];
      c.starts = c.intervals.map((iv) => iv.tStart);
    }
  }

  return { byChr };
}

/**
 * Lifts a 1-based genomic coordinate to the target build.
 */
export function liftCoordinate(
  lookup: ChainLookup,
  chr: string,
  pos1: number
): LiftedCoordinate | null {
  if (pos1 <= 0) return null;
  const pos0 = pos1 - 1;

  let cleanChr = chr.trim().toUpperCase().replace(/^CHR/, '');
  if (cleanChr === 'M') cleanChr = 'MT';
  // UCSC chain files use chrM for mitochondrial DNA
  const tName = cleanChr === 'MT' ? 'chrM' : `chr${cleanChr}`;

  const chrChains = lookup.byChr.get(tName);
  if (!chrChains) return null;

  for (let i = 0; i < chrChains.length; i++) {
    const chain = chrChains[i];
    if (pos0 < chain.tStart || pos0 >= chain.tEnd) {
      continue;
    }
    const idx = binarySearchInterval(chain.starts, pos0);
    if (idx >= 0) {
      const iv = chain.intervals[idx];
      if (pos0 >= iv.tStart && pos0 < iv.tEnd) {
        const offset = pos0 - iv.tStart;
        let qPos0: number;
        if (chain.qStrand === '+') {
          qPos0 = iv.qStart + offset;
        } else {
          // In UCSC chain format, negative query strand coordinates are given
          // relative to the reverse complement (qSize - qEnd to qSize - qStart).
          qPos0 = chain.qSize - (iv.qStart + offset) - 1;
        }

        let newChr = chain.qName.replace(/^chr/, '');
        if (newChr === 'M') newChr = 'MT';

        return {
          chr: newChr,
          pos: qPos0 + 1,
          strand: chain.qStrand,
        };
      }
    }
  }

  return null;
}

/**
 * Complements an individual allele (A <-> T, C <-> G).
 * Structural indel tokens ('I', 'D', '0', '-', '--') are unaffected.
 */
export function complementAllele(allele: string): string {
  const map: Record<string, string> = {
    A: 'T',
    T: 'A',
    C: 'G',
    G: 'C',
    a: 't',
    t: 'a',
    c: 'g',
    g: 'c',
  };
  return map[allele] ?? allele;
}

/**
 * Reverse complements genotype alleles and sorts unphased heterozygous calls.
 */
export function complementGenotype(a1: string, a2: string): { a1: string; a2: string } {
  let c1 = complementAllele(a1);
  let c2 = complementAllele(a2);

  // Alphabetically sort unphased heterozygous calls (e.g. "G A" -> "A G")
  if (c1 > c2 && c1 !== '0' && c2 !== '0') {
    const tmp = c1;
    c1 = c2;
    c2 = tmp;
  }

  return { a1: c1, a2: c2 };
}

/**
 * Remaps an entire list of parsed loci through a ChainLookup index.
 * Loci that cannot be lifted (or map into gaps) are dropped and counted.
 */
export function liftSnpList(
  snps: ParsedLocus[],
  lookup: ChainLookup
): LiftoverResult {
  const liftedSNPs: ParsedLocus[] = [];
  let remappedCount = 0;
  let droppedCount = 0;

  for (let i = 0; i < snps.length; i++) {
    const s = snps[i];
    const lifted = liftCoordinate(lookup, s.chr, s.pos);
    if (lifted) {
      remappedCount++;
      let a1 = s.a1;
      let a2 = s.a2;

      // When mapping through a minus-strand interval, complement alleles
      if (lifted.strand === '-') {
        const comp = complementGenotype(a1, a2);
        a1 = comp.a1;
        a2 = comp.a2;
      }

      liftedSNPs.push({
        rsid: s.rsid,
        chr: lifted.chr,
        pos: lifted.pos,
        a1,
        a2,
        isValid: s.isValid,
      });
    } else {
      droppedCount++;
    }
  }

  return { liftedSNPs, remappedCount, droppedCount };
}

const chainCache = new Map<string, ChainLookup>();

/**
 * Lazy loads and parses the UCSC chain file for cross-build liftover.
 */
export async function loadChain(
  fromBuild: 'GRCh37' | 'GRCh38',
  toBuild: 'GRCh37' | 'GRCh38'
): Promise<ChainLookup> {
  if (fromBuild === toBuild) {
    throw new Error(`Cannot load chain file for identical builds: ${fromBuild} -> ${toBuild}`);
  }

  const filename =
    fromBuild === 'GRCh37' && toBuild === 'GRCh38'
      ? 'hg19ToHg38.over.chain.gz'
      : 'hg38ToHg19.over.chain.gz';

  const cached = chainCache.get(filename);
  if (cached) {
    return cached;
  }

  let compressedBytes: Uint8Array;

  // Environment detection: Node.js (Vitest) vs Web Worker / Browser
  const proc = (globalThis as unknown as { process?: { versions?: { node?: string }; cwd?: () => string } }).process;
  if (proc?.versions?.node) {
    try {
      const fsMod = 'node:fs';
      const pathMod = 'node:path';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fs: any = await import(/* @vite-ignore */ fsMod);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const path: any = await import(/* @vite-ignore */ pathMod);
      const cwd = typeof proc.cwd === 'function' ? proc.cwd() : '.';
      const filePath = path.resolve(cwd, 'public/data', filename);
      if (fs.existsSync(filePath)) {
        compressedBytes = new Uint8Array(fs.readFileSync(filePath));
      } else {
        throw new Error(`Chain file not found at: ${filePath}`);
      }
    } catch {
      const url = `/data/${filename}`;
      const resp = await fetch(url);
      if (!resp.ok) {
        throw new Error(`Failed to fetch chain file ${filename}: HTTP ${resp.status}`);
      }
      compressedBytes = new Uint8Array(await resp.arrayBuffer());
    }
  } else {
    const url = `/data/${filename}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`Failed to fetch chain file ${filename}: HTTP ${resp.status}`);
    }
    compressedBytes = new Uint8Array(await resp.arrayBuffer());
  }

  const decompressed = gunzipSync(compressedBytes);
  const text = new TextDecoder('utf-8').decode(decompressed);
  const lookup = parseChainText(text);
  chainCache.set(filename, lookup);
  return lookup;
}
