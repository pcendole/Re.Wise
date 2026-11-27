# Locked Production Architecture & Tech Stack (Re.Wise)
1. **App & Play Store Shell:** React 19 + TypeScript + Vite + Tailwind CSS + Shadcn UI + Framer Motion, wrapped with **Capacitor** for Android Play Store (`.aab`) AND deployed as a fast web preview for WhatsApp/Telegram deck links.
2. **App Size Budget (<9 MB):** Use unbundled Google Play Services ML Kit (`@capacitor-mlkit/text-recognition`) for on-device OCR; never bundle `sql.js` WASM inside the Android build (load dynamically on Web only).
3. **Offline-First Local Database:** Native SQLite (`@capacitor-community/sqlite`) on Android so Android never purges user decks and 50,000+ Anki cards load in 0ms. Use a unified `src/lib/database.ts` adapter.
4. **Spaced Repetition Engine:** `ts-fsrs` (v6.0.0) running 100% locally on-device with default Desired Retention = `0.90`.
5. **Cloud Backend & Sync:** Supabase (PostgreSQL + Google/Guest Auth). Sync only changed cards in 60-second background batches to scale to millions of users.
6. **Media & Viral Deck Storage:** Cloudflare R2 ($0 egress/bandwidth) + client-side WebP image compression (<150 KB per image).
7. **AI Magic Layer:** Google Gemini Flash-Lite (`gemini-2.5-flash-lite`) via Cloudflare Workers with SHA-256 content-hash deduplication caching and daily free-tier user caps.
8. **Growth & Observability:** Firebase Cloud Messaging (daily streak push reminders), PostHog (funnel analytics), Sentry (crash reporting), Google Play Billing (Pro subscriptions/UPI).