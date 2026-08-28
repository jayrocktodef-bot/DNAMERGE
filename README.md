# 🧬 DNA SuperKit Builder

[![Production Deployment](https://img.shields.io/badge/Vercel-Live-success?style=for-the-badge&logo=vercel)](https://merge.writteninthegenome.blog)
[![GitHub License](https://img.shields.io/badge/License-MIT-amber?style=for-the-badge)](LICENSE)
[![GRCh37 Standard](https://img.shields.io/badge/Genome_Build-GRCh37%2Fhg19-brightgreen?style=for-the-badge)](#bioinformatic-specifications)
[![100% Client-Side](https://img.shields.io/badge/Privacy-100%25_Client--Side-blue?style=for-the-badge)](#architecture--privacy-guarantee)

> **High-Performance, 100% Client-Side Raw Autosomal DNA Merger**  
> Powered by **[Written in the Genome](https://writteninthegenome.blog)** and **[Genotype Scout](https://scout.writteninthegenome.blog)**.

---

## 🌟 Overview

**DNA SuperKit Builder** is a browser-based bioinformatic web application built with **React**, **TypeScript**, **Tailwind CSS**, and **Web Workers**. It merges two raw autosomal DNA microarray files (from **AncestryDNA**, **23andMe**, **MyHeritage**, **FTDNA**, or other commercial DTC vendors) into a single, deduplicated, high-density **SuperKit** file.

All file parsing, strand normalization, coordinate mapping, deduplication, and sorting run exclusively inside background **Web Workers**. No genetic raw data is ever transmitted or stored on any server.

---

## 🚀 Live Links & Subdomains

- **DNA SuperKit App**: [https://merge.writteninthegenome.blog](https://merge.writteninthegenome.blog)
- **Written in the Genome Blog**: [https://writteninthegenome.blog](https://writteninthegenome.blog)
- **Genotype Scout DNA Tool**: [https://scout.writteninthegenome.blog](https://scout.writteninthegenome.blog)

---

## 🔬 Bioinformatic Specifications

1. **Genome Build Standard**: **GRCh37 (hg19)** across all input datasets.
2. **Chromosome Normalization**: Maps all vendor notation variants:
   - `XY`, `PAR`, `01`-`22` $\rightarrow$ `1`-`22`
   - `23`, `X` $\rightarrow$ `X`
   - `24`, `Y` $\rightarrow$ `Y`
   - `25`, `26`, `M`, `MT` $\rightarrow` `MT`
3. **Genotype Sorting & Strand Matching**:
   - Unphased heterozygous calls are canonically sorted (`a1 <= a2 ? [a1, a2] : [a2, a1]`).
   - Reverse-strand complement matching ($A \leftrightarrow T, C \leftrightarrow G$) for non-ambiguous SNPs.
4. **Deduplication & Conflict Resolution**:
   - **Gap-Filling**: If one kit contains a no-call (`00`, `--`, `DD`, `0`), it is automatically replaced by a valid call from the other kit.
   - **Primary Authority**: In cases of conflicting valid calls at the same locus, defaults to the designated primary kit.
5. **Output Schemas**:
   - **AncestryDNA (5-column)**: `rsid \t chromosome \t position \t allele1 \t allele2`
   - **23andMe (4-column)**: `# rsid \t chromosome \t position \t genotype`

---

## 🎨 UI & Design Aesthetics

- **Written in the Genome Palette**: Styled with warm Amber & Gold accents (`#f59e0b`, `#fbbf24`, `#d97706`) on deep obsidian dark background (`#000000`).
- **Ethereal Visualizer Integration**: Features an animated video sequence overlay (`Ethereal_concept_art_style_Tw.mp4`) upon merge completion with full playback controls.
- **100% Mobile Touch Friendly**: Built with 48px minimum touch targets, drawer modals, and touch horizontal scrolling chromosome coverage charts.

---

## 🛠️ Local Development & Build

```bash
# 1. Clone repository
git clone https://github.com/jayrocktodef-bot/DNAMERGE.git
cd DNAMERGE

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev

# 4. Build production bundle
npm run build
```

---

## ☁️ Vercel Deployment

This project includes a `vercel.json` configuration file ready for single-click deployment to Vercel:

```bash
# Production deploy with Vercel CLI
npx vercel --prod --yes

# Attach custom domain
npx vercel domains add merge.writteninthegenome.blog dnamerge
```

---

## 🔒 Privacy & Security Guarantee

- **Zero Server Storage**: 100% of data processing occurs inside Web Worker threads in the user's browser memory.
- **No Analytics Logging of DNA Data**: Genetic raw data never leaves the local machine.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for details.
