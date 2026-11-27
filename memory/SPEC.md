Project Idea Document: Re.Wise
1. Executive Summary
Re.Wise is a modern, AI-powered active recall and spaced repetition study application designed to help students retain massive volumes of syllabus material effortlessly. While Anki is universally used by top exam scorers worldwide, its outdated interface, steep learning curve, manual card-creation friction, and upfront iOS paywall prevent millions of students from adopting it consistently. Re.Wise pairs Anki’s proven FSRS (Free Spaced Repetition Scheduler) memory engine with a clean, mobile-first, Duolingo-inspired user experience, one-click AI flashcard generation, and built-in social virality.
2. Problem Statement & Opportunity
The Core Student Pain Points
- The Familiarity Trap: Students repeatedly re-read and highlight textbooks or condensed notes, creating an illusion of mastery (recognition) that collapses under exam pressure when pure active recall is required.
- Intimidating UI & Complexity: Legacy flashcard tools overwhelm beginners with complex deck settings, learning step intervals, and four-button rating fatigue (Again, Hard, Good, Easy).
- High Card-Creation Friction: Manually typing hundreds of flashcards or cropping diagram screenshots takes hours, causing students to procrastinate or abandon spaced repetition altogether.
- Platform & Sync Barriers: Paid mobile apps on iOS and manual cloud sync steps create unnecessary friction for students studying on the go during commutes or short breaks.
The Opportunity
By combining zero-friction AI card creation (turning PDFs, handwritten notes, and diagrams into flashcards in seconds) with adaptive FSRS scheduling and social study loops, Re.Wise turns passive reading into a daily 10-minute habit.
3. Target Audience & Use Cases
1. Medical Entrance Aspirants (NEET PG, INI-CET, USMLE): High-volume volatile facts (Pharmacology, Anatomy spotters, Microbiology), Grand Test (GT) mistake decks, and visual occlusion of condensed revision sheets.
2. Civil Services & Competitive Exam Aspirants (UPSC CSE, SSC, Banking): Constitutional Articles, verbatim Preamble phrases, Geography river/climate maps, Economic definitions, and Mains/Ethics examples.
3. Engineering, Board & University Students (JEE, NEET UG, Semester Exams): Formulas, reaction mechanisms, definitions, and code concepts.
4. Language & General Learners: Vocabulary acquisition with native audio playback, contextual example sentences, and visual memory hooks.
4. Core Product Features
A. Smart Memory Engine (FSRS + Exam Modes)
- Automated FSRS Scheduling: Powered by ts-fsrs, calculating Retrievability, Stability, and Difficulty for every individual card to resurface it right before the user forgets it.
- Exam Countdown Auto-Tuning: Users enter their target exam date and daily time goal; Re.Wise automatically sets the optimal Desired Retention target (default 90%).
- Panic / Topic-Batch Mode: For crunch-time revision when exams are weeks away, students can bypass the global daily queue and manually batch-review specific high-yield decks or weak topics.
B. Multi-Modal Card Studio
1. Basic & Reversed Cards: Clean front-and-back cards supporting rich text, images, and two-way recall.
2. Smart Cloze Deletions: Highlight any keyword or number in a sentence to turn it into a fill-in-the-blank ([...]), with toggles for Hide All Blanks at Once vs. One by One, plus inline contextual hints.
3. Magic Image Occlusion: Upload or snap a photo of a diagram, map, or textbook page. AI automatically detects text labels and places tappable occlusion boxes over them (with manual box/circle tools also available) for Hide All, Guess One visual testing.
4. Voice Notes & Quick Sketches: Record 15-second personal voice explanations or draw quick diagrams directly on the back of a card for effortless auditory and visual recall.
5. Expandable "Extra Context" Drawer: Keeps the question side clean while revealing textbook screenshots, mnemonics, and explanations only after the card is flipped.
C. AI Magic Creation & Ecosystem Compatibility
- AI Note-to-Deck Generator: Upload a PDF, paste lecture notes, or snap a photo of handwritten pages. AI extracts atomic, single-fact Q&A or Cloze cards into a Swipe-to-Keep Triage Screen (Swipe Right to keep, Swipe Left to discard, Tap to edit) so users curate personalized decks in seconds.
- 1-Click .apkg & .csv Import/Export: Full compatibility with existing Anki deck packages (.apkg) and spreadsheets so students can migrate their existing decks without losing progress.
D. Distraction-Free Review Arena
- Adaptive Rating Modes:
  - Binary Mode (Default): Tinder-style Swipe Left (Forgot / Again) or Swipe Right (Got It / Good) to eliminate decision fatigue.
  - Pro 4-Button Mode: Toggleable classic view showing exact FSRS next-review intervals above Again, Hard, Good, and Easy.
- Mid-Review Quick Edit (E): Fix ambiguous card wording, add hints, or attach a diagram on the fly during a study session.
- Optional Speed Focus Timer: Gentle 5-second prompt alert and 8-second auto-flip toggle to maintain pace during high-volume review sessions.
5. Viral Growth & Social Mechanics
1. 1-Link Deck Sharing (WhatsApp / Telegram Ready): Every deck generates a public web preview link. Peers can test 5 sample cards directly in their browser without signing up and click "Clone to My Re.Wise" to add it to their library.
2. Study Squads: Private study rooms for friends and batchmates featuring daily streak rings and a weekly consistency leaderboard ranked by active days rather than raw hours.
3. Shareable "Memory Flex" Cards: Auto-generated, aesthetic milestone cards for Instagram Stories and WhatsApp Status upon hitting 7-, 30-, or 100-day streaks or mastering 500 cards.
4. Verified Deck Creator Badges: Empowers medical/UPSC educators and micro-influencers to publish official topic decks and distribute them to their student communities.
6. Technical Architecture & $0 Tech Stack
Architecture: Local-First Hybrid PWA
- Offline-First Performance: All card flips, swipes, and ts-fsrs interval calculations execute instantaneously on the user's device via IndexedDB (Dexie.js), ensuring zero lag in low-network environments (metros, hospital wards, hostels).
- Background Cloud Sync: Changes sync seamlessly to Supabase whenever the device is online.
- Installable PWA: Built with vite-plugin-pwa, allowing students to install Re.Wise onto Android and iOS home screens via a single web link with zero App Store paywalls.
Technology Stack
- Frontend: React 19, TypeScript, Vite, Tailwind CSS, Shadcn UI, Framer Motion.
- Spaced Repetition & File Parsers: ts-fsrs (FSRS algorithm), @shbernal/anki-apkg-export + sql.js (.apkg import/export).
- Local & Cloud Database: Dexie.js (local IndexedDB) + Supabase Free Tier (Google/Email Auth, PostgreSQL database, WebP/audio file storage).
- AI Layer: Google Gemini API (gemini-3.5-flash-lite & gemini-3.8-flash) via Supabase Edge Functions for PDF-to-card generation and diagram OCR bounding-box detection.
- Hosting & CI/CD: GitHub + Vercel / Cloudflare Pages (Free tier with automatic deployments).
7. Phased Execution Roadmap
- Phase 1 — Core Loop & FSRS Engine: Onboarding, Home Dashboard with Review Heatmap, Deck/Subdeck manager, Basic & Cloze Card Creator (with Extra Context drawer), and Swipe/Flip Study Arena powered by ts-fsrs and local Dexie.js storage.
- Phase 2 — Visual Memory & Anki Compatibility: Interactive Image Occlusion canvas (Hide All / Hide One) and .apkg / .csv bulk import-export.
- Phase 3 — AI Magic Studio: Gemini API integration for PDF/Photo-to-Flashcards (with the Swipe-to-Keep triage screen) and automatic text-label detection on diagrams.
- Phase 4 — Cloud Sync & Viral Loops: Supabase authentication and multi-device sync, 1-click public deck preview links, Study Squads, and downloadable Streak Milestone cards.
8. Key Success Metrics (KPIs)
- Activation Rate: Percentage of new users who create or import a deck and complete their first 10 card reviews within 5 minutes of signup.
- Day-7 & Day-30 Retention: Percentage of students maintaining a daily review streak across their first month.
- Viral Coefficient (K-Factor): Number of new users acquired per shared deck link or Study Squad invite.
- True Retention Rate: Aggregate recall accuracy across mature cards (targeting the 85%–92% FSRS sweet spot).
