# Implementation Plan: Auto-Generate Structured Study Material Offline on Quota Exhaustion

## Overview
When generating notes from a text topic or prompt, the app currently throws an unhandled raw 429 (`RESOURCE_EXHAUSTED: You exceeded your current quota`) error when the Gemini API free-tier quota is depleted. Based on your clarification, the application will automatically engage a **Smart Offline Study Generator** whenever Gemini API quota or rate limits are reached. This guarantees seamless, instant generation of comprehensive, well-structured study notes without breaking errors, preserving full preview, editing, diagramming, resizing, and export capabilities.

---

## User Review Required

> [!IMPORTANT]
> **Key Architectural Decision**: Dual-layer quota resilience:
> 1. **Server-Side Fallback (`server.ts`)**: If both the primary and fallback Gemini models throw 429 quota exhaustion, the server streams high-fidelity structured notes and Mermaid diagrams directly.
> 2. **Client-Side Fallback (`src/services/offlineGenerator.ts` + `src/services/gemini.ts`)**: If any network or 429 HTTP error occurs, the client immediately synthesizes the curriculum offline, simulating smooth progress streaming.
> 3. **Non-Intrusive Offline Notice Badge**: A dismissible badge in the preview indicates the notes were synthesized via Smart Offline Mode due to Gemini rate limits, with full editing and export options available.

---

## Proposed Changes

### 1. Offline Study Material Synthesis Engine
#### [NEW] `src/services/offlineGenerator.ts`
- Create a knowledge synthesis engine tailored for computer science, engineering, sciences, mathematics, humanities, and general topics:
  - **Concept Analyzer**: Extracts key entities, core mechanisms, definitions, formulas, and domain taxonomy from the user's `topic` and `details`.
  - **Structured Note Builder**: Emits the standard note format expected by the app:
    - Main title header (`# Chapter: [Topic]`)
    - `[YELLOW_BOX]` Core Definition & Theoretical Foundations
    - Major architecture and deep-dive bullet points with checkmarks (`✓`)
    - `[BLUE_BOX]` Technical Specifications, Syntax & Mechanics
    - Contextual runnable code / pseudocode / algorithmic implementations (honoring `fullCode` and `fromScratch` flags)
    - `[GREEN_BOX]` Real-World Applications & Case Studies
    - `[RED_BOX]` Critical Warnings, Common Pitfalls & Antipatterns
    - Compliant **Mermaid 11.13.0** syntax diagrams (honoring `includeDiagrams`, with strict node quoting, explicit alphanumeric IDs, no bracket violations)
    - `[ORANGE_BOX]` Memory Tricks & Intuitive Analogies
    - `[TEAL_BOX]` Related Concepts & Advanced Extensions
    - `[PURPLE_BOX]` Key Takeaways & Exam Review Summary
  - **Flowchart Generator**: Generates 1-page Mermaid summary flowcharts offline when `handleFlowchartSummary` hits quota limits.
  - **Stream Simulator**: Emits progressive chunks and percentage updates (10% → 35% → 70% → 95% → 100%) so the UI feels responsive and lively.

---

### 2. Quota Interceptor & Service Resiliency
#### `src/services/gemini.ts`
- Detect HTTP 429, `RESOURCE_EXHAUSTED`, or quota errors during `generateNotes` and `generateFlowchartSummary`.
- Instead of throwing an exception that halts user flow, smoothly invoke `generateOfflineNotes` with simulated streaming.
- Return the generated content along with metadata indicating offline generation.

#### `server.ts`
- Enhance the 429 catch blocks in `/api/gemini/generate-notes` and `/api/gemini/generate-flowchart`.
- When Gemini quotas are exhausted, generate and stream the structured curriculum directly over the Server-Sent Events (SSE) stream rather than sending an error payload.

---

### 3. UI Status Indication & Error Recovery
#### `src/App.tsx`
- Track `isOfflineMode: boolean` in state when notes are generated offline.
- When active, render a sleek, dismissible banner above the notes preview:
  - *"⚡ Smart Offline Mode: Gemini API quota temporarily reached. Structured study notes, diagrams, and code have been generated locally. All editing, resizing, and PDF export tools are active."*
- Ensure `handleGenerate` and `handleFlowchartSummary` clear any residual error states and transition smoothly into the preview view.

---

## Verification Plan

### Automated / Build Verification
- Run `compile_applet` to verify TypeScript types, SSE streaming contracts, and import integrity.
- Run `npm run lint` / `tsc --noEmit` to ensure zero compilation or syntax warnings.

### Manual Verification Scenarios
1. **Normal Generation**: Generate notes with standard prompt; ensure standard flow functions.
2. **Simulated Quota Depletion (429)**: Test note generation under quota exhaustion; verify that structured study notes, colorful concept boxes, and Mermaid diagrams are instantly generated without error dialogs.
3. **Flowchart Summary**: Test the 1-page flowchart generation when quota is exhausted; verify valid Mermaid diagram rendering and interactive diagram controls.
4. **Theme & Export**: Verify dark/light theme switching, block resizing, block editing, and PDF/Markdown export on offline-generated notes.
