# Launch guide

Expo's cloud services (EAS) build, sign and submit both apps, so no Mac is needed. Fees and rules were checked in November 2026 against secondary sources; confirm them on Apple's and Google's sites.

## 1. One-time setup

| Step | Notes |
|---|---|
| Apple Developer Program | $99 / year |
| Google Play developer account | $25 once. **New personal accounts must run a closed test with 12+ testers for 14 days** before production; organisation accounts are exempt. Start early. |
| Expo account | `npm install --global eas-cli && eas login` |
| Name check | Search both stores and trademark databases for "Streakline". Change `name` in `app.json` if needed. |
| Identifiers | Replace `com.example.streakline` (iOS `bundleIdentifier`, Android `package`) in `app.json`. The Android package can't change after the first upload. |
| Link the project | `cd streakline-app && npx eas-cli@latest init` |

## 2. Test on real phones

```sh
npx expo start                                                     # Expo Go
npx eas-cli@latest build --platform android --profile preview      # installable APK
npx eas-cli@latest build --platform ios --profile preview          # ad-hoc build for registered iPhones
```

Check on a device what a browser can't: haptics, the share-image flow (`react-native-view-shot` + share sheet), and the focus timer across app restarts.

## 3. Store listing

- **Name:** Streakline: Focus & Habits (26 of 30 characters)
- **Subtitle:** Tap to log. Share the streak. (29 of 30)
- **Category:** Productivity (primary), Health & Fitness (secondary)
- **Screenshots:** Today grid, a Space board, Community feed, Leaderboard, Insights grid, Share card (use the sample data). Captions: "Tap to log anything", "Design your own spaces", "Share the streak", "Compete on consistency", "See every day you showed up".
- **Keywords:** habit tracker, streak, focus timer, deep work, study tracker, productivity, accountability, pomodoro, routine, goals
- **Privacy policy URL:** required. State that the current version stores everything on the device and collects nothing.

## 4. Privacy forms (this version)

- **Apple App Privacy:** Data Not Collected (no accounts, analytics or ads SDKs; everything stays on the device).
- **Google Data safety:** no data collected or shared.
- **App Review notes:** "The Community tab shows a labelled preview community of sample members; no accounts or user-generated content are shared between users in this version. Tap 'Explore with sample data' on the first screen to see every feature."

When you switch on accounts (see [backend.md](backend.md)), update both forms and add report/block, in-app account deletion and Sign in with Apple *before* submitting that version.

## 5. Build and submit

```sh
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest submit --platform android    # needs a Google service account key in Expo
```

`eas.json` sends Android builds to the internal track as drafts. Promote to a closed test (12 testers, 14 days), then apply for production.

## 6. First 90 days

1. **Build in public:** post your own share cards daily on TikTok, Instagram and X (#deepwork, #studywithme, #buildinpublic).
2. **Seed segments:** recruit 20–50 founding members per segment (study Discords, PhD communities, indie-hacker groups) so leaderboards are real on day one of accounts.
3. **Weekly challenges:** Monday "Deep Focus Week" and monthly "30 ideation hours", each with a shareable invite.
4. **Creators:** productivity and study creators, with free Pro plus an affiliate code.
5. **Measure:** onboarding completion, D7/D30, logs per day, weekly posting rate, props given (targets in [product.md](product.md)).
