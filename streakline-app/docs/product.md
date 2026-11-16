# Streakline: product plan

**One line:** A tap-to-log tracker for every kind of consistency (deep focus, ideation, study, research, fitness, sleep) with boards you design yourself and a Strava-style community to share the streak.

## Why this can work

- **The workout-sharing loop already works, but only for sport.** Strava turned training into identity and social proof (reported ~$415–500M ARR, IPO filing in 2026). Nothing does the same for the *other* things people grind at: deep work, study, research, creative output, sleep.
- **Minimal habit trackers are spreading on social media** (grid, tap-to-log, contribution-chart aesthetics), but most are solo tools with no community and no workspace.
- **Productivity tools are workspaces without accountability.** Notion-style folders hold plans; nothing keeps the daily reps honest.
- **What retains users:** low-friction logging (one tap), visible progress (grids, streaks), social accountability (followers, props, leaderboards) and a recurring reason to return (daily goals, weekly boards, challenges).

## Who it is for

Students, researchers, makers and founders, knowledge workers, and anyone with a "build in public" streak to keep. They already post study-with-me and deep-work timelapses; Streakline gives them the scoreboard.

## Core concepts

| Concept | What it is |
|---|---|
| **Tracker** | One habit: done/not, a count (2 papers), or time (90 min deep work). Each has a segment and a visibility (Community / Only me). |
| **Segment** | The "sport": Deep Focus, Ideation, Study, Research, Fitness, Sleep & Recovery, Personal. Each segment has templates, a leaderboard and challenges. |
| **Space** | A folder you design: a board of trackers, tasks, notes, headings and sub-folders, in list, 2- or 3-column layout. Tasks can report progress to a tracker. |
| **Streak & grid** | Days in a row at goal, plus a contribution grid per tracker. |
| **Post** | When a public tracker hits its daily goal it posts to your feed automatically (like an uploaded run). Undo the log and the post disappears. |
| **Props** | One-tap appreciation on a post. Comments for words. |
| **Leaderboard** | Per segment, ranked by 7-day consistency (not raw hours), so a steady person beats a binge. |
| **Challenge** | Time-boxed goals (Deep Focus Week: 5 × 90 min; 30 ideation hours) that create a tracker and show progress. |
| **Share card** | A story-sized image of your streak and grid for Instagram and friends: the growth loop. |

## What is built (MVP)

| Area | Status |
|---|---|
| Onboarding: profile, pick segments → starter trackers + a space per segment, sharing preference, sample-data mode | ✅ |
| Today: 3-column tap-to-log grid, progress fill, streak badges, segment filter, edit mode (reorder / hide), entries log | ✅ |
| Focus timer: start / pause / resume / finish & log, survives navigation, quick-log +15/30/45/60 | ✅ |
| Tracker page: stats, contribution grid, quick actions, undo, edit, hide, delete | ✅ |
| Spaces: templates (Ideation lab, Research hub, Study plan, Deep work, Training block), nested folders, breadcrumbs, blocks (tracker / task / note / heading / folder), reorder, wide/small, layout 1-2-3 columns, note editor, tasks linked to trackers | ✅ |
| Community: feed (Following / Everyone), auto-posts, props, comments, follow, segment leaderboards, challenges with progress | ✅ (preview community) |
| Insights: overall grid, segment consistency, per-tracker grids | ✅ |
| Share: story card captured as an image (iOS / Android) or text (web), post to feed with caption | ✅ |
| Privacy: per-tracker visibility; private trackers never post or rank | ✅ |
| Tests: 27 unit tests on streaks, grid, timer, reducer, auto-posting, spaces, feed, leaderboards, challenges | ✅ |

## Monetisation

Free: unlimited daily logging, up to 3 spaces, feed, props, comments, public leaderboards.

**Streakline Pro** ($4.99/month or $34.99/year, 7-day trial):
- Unlimited spaces and nested folders
- Full-history insights, yearly grid, CSV export
- Custom challenges with friends; private clubs (study groups, lab teams, cohorts)
- Premium share-card themes
- Home-screen widgets (v1.1)

Later: **Clubs for organisations** (bootcamps, labs, study communities): an admin dashboard and team leaderboards, priced per seat.

## Growth loops

1. **Share card → install.** Every story post carries the wordmark and handle.
2. **Challenges → invites.** "Join my Deep Focus Week" deep link.
3. **Leaderboards → return visits.** Weekly reset every Monday; a recap notification.
4. **Templates → community content.** Later: publish your space as a template (a "study system" others can copy).

## Metrics

| Metric | Target |
|---|---|
| Onboarding completion | > 70% |
| Day-7 retention | > 30% |
| Day-30 retention | > 12% (category median ~3–6%) |
| Logs per active user per day | ≥ 3 |
| Share of users with ≥1 public post per week | > 40% |
| Props given per weekly active user | ≥ 5 |

## Roadmap

| Version | What |
|---|---|
| 1.0 | This MVP + Pro paywall (RevenueCat) + store assets |
| 1.1 | **Accounts and real community** (see [backend.md](backend.md)): sign-in, sync, real feed, report/block, account deletion |
| 1.2 | Clubs (groups with their own feed and board), friend challenges, deep links |
| 1.3 | Widgets, reminders, Apple Health / Health Connect for sleep and workouts, Screen Time-based "phone-free" checks |
| 1.4 | Publish and copy space templates; a template gallery per segment |
| 2.0 | Web app for desktop deep work and Clubs for organisations |
