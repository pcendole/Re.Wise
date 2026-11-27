# Re.Wise 🌿🧠

> **An intelligent, offline-first spaced repetition memory system built for competitive aspirants.**
> Engineered with the state-of-the-art **FSRS (Free Spaced Repetition Scheduler)** algorithm, multi-modal flashcard creation, and a distraction-free **Warm Paper & Forest** aesthetic.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8.svg)](https://tailwindcss.com/)
[![Capacitor](https://img.shields.io/badge/Capacitor-Android_7.0-119EFF.svg)](https://capacitorjs.com/)
[![FSRS](https://img.shields.io/badge/FSRS-v6.0-2D5340.svg)](https://github.com/open-spaced-repetition/fsrs.js)

---

## 🌟 Key Highlights

### 1. FSRS Spaced Repetition Core Engine
- **Target Retention (0.85 – 0.95)**: Adaptive scheduling via `ts-fsrs` with mathematical interval calculations superior to legacy SM-2.
- **Hierarchical Deck Scheduling**: Subdecks automatically aggregate into parent queues for unified review sessions.
- **Dual Study Arena**:
  - **Binary Tinder Swipe Mode**: Fast rapid-fire triage (`Again` ✕ vs `Good` ✓).
  - **Pro 4-Button Mode**: Granular interval adjustments (`Again`, `Hard`, `Good`, `Easy`).
- **Comprehensive Study Tooling**:
  - **Undo Last Review**: Revert previous card rating and restore FSRS scheduling state in 1 tap.
  - **Flag / Bookmark**: Isolate volatile, high-yield cards into a dedicated queue.
  - **Distraction-Free Whiteboard Overlay**: Finger/stylus scratchpad for solving formulas or active recall scribbling.
  - **Text-to-Speech (TTS)**: 1-tap audio narration for hands-free audio review.

### 2. Multi-Modal Flashcard Studio
- **Basic Flashcards**: Front/Back atomic prompt cards with Markdown support.
- **Smart Cloze Deletions**: Anki-compatible `{{c1::...}}` syntax with one-by-one or hide-all modes.
- **Interactive Image Occlusion**: Built-in canvas to draw bounding boxes and hide anatomy/diagram labels with automatic WebP compression (<150 KB).
- **15-Second Voice Notes**: Record personal voice mnemonics attached directly to flashcards.
- **Hand-Drawn Sketch Pad**: Finger/stylus canvas for quick mnemonics and diagrams.
- **AI Magic Studio**: Generate high-yield flashcard decks from raw lecture notes or textbook snippets with a Swipe-to-Keep triage workflow.

### 3. Ecosystem Compatibility
- **Anki `.apkg` Importer & Exporter**: Import your existing Anki collections or export decks for sharing.
- **CSV / TSV Importer & Exporter**: Bulk import tabular flashcard notes.
- **Panic / Cram Mode**: Filter and cram targeted subsets (Weak, New, Due, Tag-based) without altering long-term FSRS scheduling.

### 4. Cloud Sync & Social Loops
- **60-Second Batched Sync**: Background synchronization with Supabase when online.
- **1-Link Public Web Deck Sharing**: Share any deck via `?share=:slug` with interactive 5-card preview and 1-tap cloning.
- **Study Squads**: Accountability groups with weekly consistency habit rings and join codes.
- **Memory Flex**: Export 1080×1920 Instagram & WhatsApp story milestone cards celebrating your review streaks.

### 5. Warm Paper & Forest Aesthetic
- Custom-crafted palette:
  - `--bg-canvas`: `#F7F7F4` (Warm Paper)
  - `--bg-card`: `#FFFFFF`
  - `--border-subtle`: `#E6E8E3`
  - `--text-primary`: `#1D2923`
  - `--text-secondary`: `#5F6E66`
  - `--accent-forest`: `#2D5340` (Forest Green)
  - `--pill-sage`: `#E8EFEA` (Sage Pill)
- **OLED Dark Mode**: Pure black canvas (`#000000`) with emerald-forest accents.

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/) + [Vite 6](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Spaced Repetition**: [ts-fsrs](https://github.com/open-spaced-repetition/fsrs.js)
- **Mobile Native**: [Capacitor](https://capacitorjs.com/) (Android) + Native SQLite (`@capacitor-community/sqlite`)
- **Backend & Auth**: [Supabase](https://supabase.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/pcendole/Re.Wise.git
cd Re.Wise

# Install dependencies
npm install

# Start local development server
npm run dev
```

### Production Build

```bash
# Typecheck and build optimized bundle
npm run build

# Preview production build
npm run preview
```

### Android Native Setup

```bash
# Sync Capacitor web build to Android project
npx cap sync android

# Open in Android Studio
npx cap open android
```

---

## 📄 License
MIT License. Built for ambitious competitive aspirants worldwide.
