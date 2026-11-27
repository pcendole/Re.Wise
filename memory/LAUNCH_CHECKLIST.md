# Re.Wise — Production Deployment & Google Play Release Checklist

This runbook outlines the exact step-by-step procedures to deploy the backend, publish the web preview, and build the optimized, signed Android `.aab` package (<9 MB) for the Google Play Console.

---

## 1. Supabase Backend & AI Edge Function Deployment

### Prerequisites
- Supabase Account & Project (`https://supabase.com`)
- Google Gemini API Key (`https://aistudio.google.com/app/apikey`)
- Supabase CLI installed:
  ```bash
  npm install -g supabase
  ```

### Step 1.1: Authenticate & Link Project
```bash
# Log in to Supabase CLI
supabase login

# Link your local repo to the remote project
supabase link --project-ref <YOUR_SUPABASE_PROJECT_REF>
```

### Step 1.2: Apply Database Schema & RLS Policies
Run the unified schema via the Supabase SQL Editor or push using the CLI:
```bash
# Push SQL schema directly from supabase/schema.sql
supabase db push
```
*Verification*: Check that all 8 tables (`profiles`, `decks`, `cards`, `user_stats`, `shared_decks`, `squads`, `squad_members`, `ai_usage`) exist with Row-Level Security (RLS) enabled.

### Step 1.3: Set Server-Side Secrets & Deploy Edge Function
```bash
# Set Gemini API Key secret in Supabase vault
supabase secrets set GEMINI_API_KEY="AIzaSyYourSecretGeminiKeyHere"

# Deploy the AI Studio edge function
supabase functions deploy ai-studio --no-verify-jwt
```

### Step 1.4: Verify Edge Function Endpoint
```bash
curl -i -X POST "https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/functions/v1/ai-studio" \
  -H "Content-Type: application/json" \
  -d '{"text":"Epinephrine 1:1000 IM is drug of choice for anaphylactic shock."}'
```
Expected response: HTTP 200 with structured JSON array containing atomic flashcard objects conforming to the Minimum Information Principle.

---

## 2. Web Hosting & Public Preview Deployment

Re.Wise operates as an installable PWA and web preview engine for WhatsApp/Telegram shared links (`?share=:slug`).

### Step 2.1: Production Build
```bash
# Build production web bundle
npm run build
```

### Option A: Cloudflare Pages (Recommended - $0 Egress Bandwidth)
1. In Cloudflare Dashboard -> **Workers & Pages** -> **Create application** -> **Pages**.
2. Connect your GitHub repository.
3. Configure build settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Build Output Directory**: `dist`
4. Add Environment Variables:
   - `VITE_SUPABASE_URL`: `https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `<YOUR_SUPABASE_ANON_KEY>`
   - `VITE_GEMINI_API_KEY`: *(Optional fallback)*
5. Click **Save and Deploy**.

### Option B: Vercel
```bash
# Deploy to Vercel production
npx vercel --prod
```

---

## 3. Android Capacitor Build (<9 MB) for Google Play Console

### Step 3.1: Synchronize Web Assets with Android Platform
```bash
# Build the latest web distribution
npm run build

# Add or sync Android project with Capacitor
npx cap add android   # (Run only if android directory does not exist yet)
npx cap sync android
```

### Step 3.2: Generate Production Keystore
Generate a 2048-bit RSA release signing key:
```bash
keytool -genkey -v \
  -keystore rewise-release-key.jks \
  -alias rewise-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass YourSecurePassword123 \
  -keypass YourSecurePassword123
```
*Security Note*: Keep `rewise-release-key.jks` in a secure location and add it to `.gitignore`. Never commit keys to version control.

### Step 3.3: Configure Gradle Signing & ProGuard Optimization
In `android/app/build.gradle`:
```groovy
android {
    ...
    defaultConfig {
        applicationId "com.rewise.app"
        minSdkVersion 24
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
    }

    signingConfigs {
        release {
            storeFile file("../../rewise-release-key.jks")
            storePassword System.getenv("KEYSTORE_PASSWORD") ?: "YourSecurePassword123"
            keyAlias "rewise-key"
            keyPassword System.getenv("KEY_PASSWORD") ?: "YourSecurePassword123"
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

In `android/app/proguard-rules.pro`, retain Capacitor & SQLite native interfaces:
```proguard
# Keep Capacitor & SQLite Native bindings
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorcommunity.sqlite.** { *; }
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
```

### Step 3.4: Build Signed Android App Bundle (.aab)
```bash
cd android
./gradlew bundleRelease
```
The output file will be generated at:
`android/app/build/outputs/bundle/release/app-release.aab`

### Step 3.5: Verify App Size Budget (<9 MB)
Check the universal APK compressed download size:
```bash
# Using bundletool to verify Play Store delivery size
bundletool build-apks \
  --bundle=app/build/outputs/bundle/release/app-release.aab \
  --output=rewise-test.apks \
  --mode=universal

# Inspect size (expected: ~5.5 MB - 6.8 MB, well below the 9 MB budget)
ls -lh rewise-test.apks
```

---

## 4. Google Play Console Listing Checklist

1. **App Identity**:
   - **App Name**: Re.Wise: Spaced Repetition FSRS
   - **Short Description**: Active recall & spaced repetition with AI flashcards for NEET PG, USMLE & UPSC.
   - **Full Description**: Focus on FSRS memory engine, Minimum Information Principle, image occlusion, 1-click Anki import, and offline-first performance.
2. **Graphic Assets**:
   - **App Icon**: 512x512 PNG exported from `public/icon.svg`.
   - **Feature Graphic**: 1024x500 PNG with Re.Wise brand emblem and "Active Recall • FSRS Spaced Repetition".
   - **Screenshots**: Minimum 4 phone screenshots (Dashboard, Smart Cloze Editor, 3D Study Arena, Streak Heatmap / Memory Flex).
3. **Data Safety**:
   - Offline-first: Data stored locally on device via native SQLite.
   - Cloud sync: Optional user-authenticated data transfer over encrypted HTTPS.
   - No sensitive data sold or shared with third parties.
4. **Target Audience**: Age 13+ (Students & Medical/Civil Service Aspirants).
5. **Release Track**: Start with **Internal Testing Track** -> Roll out to **Closed Testing** -> **Production**.
