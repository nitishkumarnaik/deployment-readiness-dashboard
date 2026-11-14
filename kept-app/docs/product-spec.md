# Product spec: ideas, choice and roadmap

## 1. Six ideas, scored

Each is scored 1–5 on six criteria (higher is better; for risk, 5 = lowest store/regulatory risk). "Solo-buildable" means one developer can ship a credible v1 on both stores in weeks, without a backend.

| # | Idea | Demand | Will pay | Different | Retention loop | Solo-buildable | Low risk | **Total** |
|---|---|---|---|---|---|---|---|---|
| 1 | **Kept**: muscle-first GLP-1 companion. Protein floor + strength plan that adapts to your dose cycle | 5 | 5 | 4 | 4 | 5 | 3 | **26** |
| 2 | **Squad Streaks**: 3–5 friends share one streak and a living garden; accountability without leaderboards | 4 | 3 | 4 | 5 | 3 | 5 | **24** |
| 3 | **Energy Budget**: "spoon" planner for chronic fatigue, long COVID and perimenopause | 3 | 3 | 5 | 4 | 5 | 4 | **24** |
| 4 | **Kind Plate**: shame-free photo journal that counts what you *add* (protein, fibre, plants), not calories | 4 | 4 | 3 | 3 | 3 | 4 | **21** |
| 5 | **Zero-Log Coach**: one daily card from Apple Health / Health Connect, no manual logging | 4 | 4 | 2 | 3 | 3 | 4 | **20** |
| 6 | **Desk Snacks**: 2-minute movement breaks slotted into calendar gaps | 3 | 2 | 3 | 3 | 4 | 5 | **20** |

Why the others lost: #5 competes head-on with Google, Oura and Whoop; #4 needs paid vision AI per photo and sits next to MyFitnessPal + Cal AI; #2 needs a backend and has a cold-start problem (it's only fun once friends join). **#2 and #3 are strong second bets**, and #2's mechanics can later be added to Kept as "GLP-1 buddies".

## 2. The pick: Kept

**One line:** Lose the weight, keep the muscle.

**For:** adults on weekly or daily GLP-1 medication (semaglutide, tirzepatide and others), especially in the first six months.

**Problem:** GLP-1 weight loss can include significant muscle loss. Protein and resistance training help, but side effects (nausea, fatigue, low appetite) make both hard, and they follow a weekly pattern no app accounts for.

**Insight → feature:**

| Why users quit (research) | What Kept does |
|---|---|
| Manual logging is tedious | No food database. One number (protein), logged with one tap. Check-in takes 10 seconds. |
| Shame and unreachable goals | A *floor*, not a ceiling. Missed sessions quietly move to later in the week with no red marks. Low-energy versions "still count". |
| No visible results | Muscle Score: one weekly number you control, unlike the scale. |
| Generic plans ignore how you feel | **Dose-cycle intelligence** learns which days after your dose you feel worst and plans around them. |
| No role after the goal | A clinician summary for every appointment, and the habit of protecting muscle continues in maintenance. |

### Core loop (daily, under 60 seconds)
1. Open → see today's protein progress and plan.
2. Tap quick-adds as you eat (+25 g shake, +30 g chicken…).
3. 10-second check-in (nausea / fatigue / appetite).
4. On strength days: a 20-minute session, or a 12-minute low-energy version.

### Weekly loop
Dose day reminder → log dose → the plan re-balances → Muscle Score for the week.

### Innovation: dose-cycle intelligence (`src/lib/cycle.ts`, `src/lib/plan.ts`)
- Each check-in is mapped to its **cycle day** (days since the last logged dose; it follows the user if they move their dose day).
- Symptom burden per cycle day is a **shrinkage estimate**: a typical prior pattern (side effects higher on days 1–2) blended with the user's own data, so one bad day doesn't swing the plan. The plan becomes "personal" after 7+ check-ins covering 4+ cycle days.
- The weekly planner places N strength sessions on the lowest-burden days, avoids back-to-back days, makes the peak day a rest day, never schedules in the past, and labels forced sessions honestly as "catch-up".

## 3. What's in the MVP (built, in this folder)

| Area | Status |
|---|---|
| Onboarding: medication, schedule, weight, goal, protein floor, sessions/week, reminders, medical disclaimer | ✅ |
| Today: dose-day card, protein floor with quick-adds + undo, low-appetite mode, today's plan, check-in, weekly stats | ✅ |
| Train: cycle-aware weekly plan, 3 home workouts (A/B/C), each move with a low-energy version | ✅ |
| Session: tick off exercises, low-energy toggle, logs the session | ✅ |
| Insights: Muscle Score (8-week history), protein 14-day chart, dose-cycle chart + insight, weight trend | ✅ |
| Clinician summary (14/30/90 days) with share sheet | ✅ |
| Local reminders: dose day 9:00, protein check 19:00 | ✅ |
| Settings: edit everything, sample data, delete all data | ✅ |
| Local-first storage; no account, no server, no analytics | ✅ |
| Light + dark mode, screen-reader labels | ✅ |
| Unit tests for all core logic (34 tests) | ✅ |

## 4. Monetisation plan (add before or soon after launch)

Free forever: protein floor, dose log, check-ins, 1 workout, this week's plan.

**Kept Plus**: $6.99/month or **$39.99/year** with a 7-day free trial (in line with GLP-1 trackers at $9.99 / $39.99):
- Personal dose-cycle plan (the adaptive planner)
- All workouts + low-energy versions + progressions
- Full history, Muscle Score trends, clinician summaries
- Apple Health / Health Connect sync (weight, workouts)

Implementation: RevenueCat (`react-native-purchases`) with a paywall after onboarding and on Plus features. It needs a development build (not Expo Go).

## 5. Roadmap

| When | What |
|---|---|
| v1.0 (launch) | This MVP + paywall + store assets |
| v1.1 | Apple Health / Health Connect: read weight, write workouts. Home-screen widget (protein remaining). |
| v1.2 | Progressive overload (track weights and reps), more workouts (gym, seated, travel) |
| v1.3 | **GLP-1 buddies**: pair with a friend, shared weekly Muscle Score (idea #2 mechanics) |
| v1.4 | Maintenance mode: tapering, the "after the goal" plan |
| v2 | Optional photo protein estimate; optional encrypted cloud backup |

## 6. Success metrics

| Metric | Target | Category benchmark |
|---|---|---|
| Onboarding completion | > 70% | n/a |
| Day-7 retention | > 25% | ~10–15% |
| Day-30 retention | > 10% | ~3–6% |
| Weekly check-ins per active user | ≥ 4 | n/a |
| Trial → paid | > 35% | ~38% median |
| Share of Plus on annual | > 60% | ~68% |

## 7. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Seen as medical advice / medical device | Wellness positioning; never suggests doses; disclaimers in onboarding, check-in and settings; the clinician summary only reports what the user logged. Check your local rules (FDA general-wellness guidance in the US; MDR in the EU) before adding features that interpret symptoms. |
| Trademarks | Generic drug names only (semaglutide, tirzepatide…). No brand names in the app name, icon or keywords. |
| Health-data privacy | Local-first; App Store label "Data Not Collected"; no ads or analytics SDKs. |
| Crowded GLP-1 tracker space | Differentiate on muscle + adaptive plan, not on dose logging. |
| GLP-1 market shifts (pills, prices) | Supports weekly and daily dosing; the muscle-protection need stays the same. |
