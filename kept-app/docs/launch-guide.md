# Launch guide: App Store and Google Play

You don't need a Mac. Expo's cloud build and submit services (EAS) build and sign both apps for you.

Costs and rules below were checked in November 2026 against secondary sources; confirm them on Apple's and Google's own sites before you pay.

## 0. Before anything else (one-time)

| Step | Cost | Notes |
|---|---|---|
| Apple Developer Program | **$99 / year** | Enrol as an individual or an organisation. An organisation needs a D-U-N-S number but shows your company name as the seller. |
| Google Play developer account | **$25 one-time** | Needs ID verification. **Personal accounts created after 13 Nov 2023 must run a closed test with 12+ testers for 14 days before production.** Organisation accounts are exempt. Start this early. |
| Expo account | Free tier is enough to start | `npm install --global eas-cli && eas login` |
| Pick the final name | n/a | Search both stores and a trademark database (USPTO / EUIPO / your country's) for "Kept". Change `name` in `app.json` if needed. |

## 1. Make the project yours

In `app.json`:

```jsonc
"ios":     { "bundleIdentifier": "com.yourcompany.kept" },   // replace com.example
"android": { "package": "com.yourcompany.kept" }             // must match; can't change after first upload
```

Then link the project to your Expo account (this adds `extra.eas.projectId` to the config):

```sh
cd kept-app
npx eas-cli@latest init
```

## 2. Try it on your phone

```sh
npm install
npx expo start          # scan the QR code with Expo Go (iOS / Android)
```

To test reminders and the release build itself, make an internal build:

```sh
npx eas-cli@latest build --platform android --profile preview   # APK you can install directly
npx eas-cli@latest build --platform ios --profile preview       # registers your iPhone for ad-hoc install
```

## 3. Store assets you need

| Asset | Where | Notes |
|---|---|---|
| App icon | `assets/icon.png` (1024×1024) | Done. Swap it for a designer's version later. |
| Screenshots | Both stores | iPhone 6.9" (1320×2868) and 6.5"; Android phone. 4–6 screens: Today, Train, Insights (dose cycle), Session, Clinician summary. Use the in-app sample data. Add a one-line caption on each. |
| Privacy policy URL | Both stores (required for health apps) | Publish `docs/privacy-policy.md` (e.g. GitHub Pages, Notion, your site). |
| Support URL / email | Both stores | A simple page or a mailto address. |
| Listing text | Both stores | See [store-listing.md](store-listing.md). |
| Feature graphic | Google Play (1024×500) | Icon + tagline on brand green. |

## 4. Fill in the privacy and health forms

**Apple App Store Connect**
- App Privacy → **Data Not Collected** (true for this version: everything stays on the device, with no analytics or ads SDKs). Update it if you add RevenueCat, analytics or crash reporting.
- Category: **Health & Fitness**. Age rating questionnaire: medical/treatment information = "Infrequent/Mild" is typical for a tracker; answer honestly.
- Since spring 2026 you can state regulatory status for Health & Fitness apps in some regions. Kept is a general-wellness tracker, not a regulated medical device.
- Review notes: *"Kept is a wellness tracker for people already prescribed GLP-1 medication. It does not recommend or calculate doses. Tap 'Explore with sample data' on the first screen to see every feature without entering personal data."*
- Guideline 5.1.3: health data must not be used for advertising and must not be sold. Kept has no ads.

**Google Play Console**
- Policy → App content → **Health apps declaration**: required for every app. Pick the health/fitness categories that apply (fitness, nutrition, medication tracking).
- **Data safety form**: no data collected or shared (for this version).
- Content rating questionnaire; target audience 18+.
- Privacy policy URL.

## 5. Build and submit

```sh
# iOS: builds, signs (EAS handles certificates) and uploads to App Store Connect / TestFlight
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios

# Android: builds an .aab for Play
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest submit --platform android      # needs a Google Service Account key uploaded to Expo
```

`eas.json` already sends Android builds to the **internal** track as a draft. Then:

1. **TestFlight**: invite 10–20 people on GLP-1 medication (Reddit r/Semaglutide, r/Mounjaro and r/Zepbound communities, or friends), and fix what they hit.
2. **Google Play closed test**: promote the build to a closed track with 12+ opted-in testers, keep them active for 14 days, then apply for production access.
3. Submit for review on both stores. Apple review usually takes a day or two; Google's production review can take several days.

Version bumps: `appVersionSource: remote` + `autoIncrement` means EAS increments build numbers for you. Change `version` in `app.json` for user-visible releases.

## 6. Launch plan (first 90 days)

The Cal AI and Shotsy pattern: niche + shareable + creators, with no big ad budget.

1. **Before launch**: a landing page with a waitlist; 3–5 short videos ("what I eat on a low-appetite GLP-1 day to hit 100 g protein").
2. **Communities**: be useful in GLP-1 subreddits and Facebook groups (read their self-promotion rules first). Share the clinician summary and the dose-cycle chart, the "aha" features.
3. **Creators**: GLP-1 journey creators on TikTok, Instagram and YouTube. Offer free Plus plus an affiliate code.
4. **App Store Optimisation**: title "Kept: GLP-1 Protein & Strength"; keywords around protein tracker, GLP-1 companion, muscle, weight loss workout (no drug brand names).
5. **Clinicians and dietitians**: the clinician summary is a reason for them to recommend the app.
6. **Measure**: onboarding completion, D7/D30 retention, check-ins per week, trial → paid. See product-spec §6.

## 7. Before you add features that touch regulation

Kept stays a **general-wellness** product as long as it logs and organises what the user tells it, and does not diagnose, treat or recommend doses. If you later add things like symptom-based medical alerts or dose titration help, get regulatory advice first (FDA in the US, MDR in the EU, MHRA in the UK, CDSCO in India).
