# Atlas feature guide

Everything below is built and works offline on iPhone and iPad. The **Roadmap** section at the end lists high-value ideas that need a backend or third-party services.

## For you, the trainer

### Today dashboard
- Greeting, today's date and four headline numbers: sessions this week (vs last week), active clients, average readiness of clients who checked in, and revenue this month.
- **Today's schedule.** Tap any appointment to start the workout, run a check-in, open the client, or mark it completed / no-show / cancelled.
- **Needs attention.** Flags are ranked by severity and generated automatically:
  - low readiness today (score < 55), with the suggested adjustment
  - workload spike (acute:chronic ratio > 1.3 or > 1.5)
  - no session in 10+ days
  - no check-in for 5+ days
  - package finished or ≤ 2 sessions left, and unpaid packages
  - birthday within 7 days
  - goal due within 3 weeks and less than 80% complete
- **Readiness board.** Every active client ranked lowest first, with a 14-day sparkline, so you know who needs a lighter session before they arrive.
- **Recent PRs** across all clients, with the % improvement.

### Clients
- Search, filter by active / paused / archived, and see the latest readiness, last-session recency and sessions left for each client.
- Profile: contact details (tap to call or email), DOB/age, sex, height, activity level, tags, colour, start date and goal statement.
- **Health screening.** Injuries and limitations, medical notes, emergency contact, and the 7-question **PAR-Q** with a clearance warning. Health flags appear at the top of the client page and in the workout logger.
- **Coaching notes** with pinning.
- Delete with a full cascade, or archive to keep history.

### Workout logger
- Start from a **template**, **repeat** one of the last 3 sessions, or start **empty**.
- Every set row shows **last time's numbers**. Tap ✓ to log: blank fields fill from last time or the template target, so a typical set takes one tap.
- Weight × reps, reps-only, timed and distance + time exercises.
- Set types (warm-up, drop, failure), per-set RPE, and per-exercise notes and rest time.
- **Live PR detection.** A PR badge and toast appear the moment a set beats the client's best estimated 1RM or heaviest weight.
- **Rest timer.** Starts automatically after each set, with ±15 s, skip, and a beep/vibration at zero. It stays accurate if the phone sleeps.
- **Plate calculator** from the exercise menu (kg or lb plates). Exercises can be reordered, replaced or removed.
- Readiness and injury banners at the top, so today's advice is visible while you coach.
- **Screen stays awake** during the session (Wake Lock).
- Finishing asks for **session RPE (Borg CR-10)** and notes, deducts from the client's package, and closes today's appointment.
- **Session summary**: volume, sets, duration, load, PRs vs previous best, **Send to client** (native share sheet / clipboard), Repeat, and Save as template.

### Library
- About 95 built-in exercises with primary/secondary muscles, equipment, category and coaching cues. Add custom exercises with your own cues and demo-video links.
- Each exercise page has a **client leaderboard** of best estimated 1RMs.
- Six starter **templates** (Full Body A/B, Upper, Lower, Conditioning, Mobility & Recovery). Templates support sets, rep targets, rest and notes, reordering, duplicating, and "Start with a client".

### Schedule
- Week strip with booking dots, a day agenda and a "coming up" list.
- Book sessions, assessments, check-in calls or online sessions. **Repeat weekly** for N weeks.
- Export an **.ics calendar invite** to send to the client.
- Weekly booked count, coaching hours and no-shows.

### Business
- Session **packages**: size, price, purchase and expiry dates, paid flag. Sessions are auto-deducted when a workout is finished (toggle in Settings), with manual +/- adjustment.
- Revenue and sessions delivered per month (last 6 months), attendance rate, outstanding payments, and a renewals-due list.

### Coach tools
- 1RM calculator with a %1RM and rep table, plate calculator, interval timer (Tabata, EMOM, custom work/rest/rounds) and an RPE ↔ reps-in-reserve chart.

## Training analytics
- **Estimated 1RM trend** per lift (Epley), best set, % change since first logged and PR count.
- **Weekly volume** (tonnage) for 12 weeks.
- **Sets per muscle group** per week (primary = 1, secondary = 0.5) against a 10 sets/week hypertrophy guideline, over 7 days or a 4-week average.
- **Attendance heatmap** for 12 weeks, week streak, sessions per week and average duration.
- Full session history.

## Recovery analytics
- **Daily check-in** in about 30 seconds: sleep hours and quality, energy, mood, stress, muscle soreness with body areas, optional **HRV** and **resting HR** (from Apple Watch, Whoop, Oura, etc.) and notes.
- **Readiness score (0–100)** with a component breakdown and a training recommendation: ready / moderate / low / recover.
- HRV and resting HR are compared with the client's own **7-day baseline**.
- **Acute:chronic workload ratio** (session RPE × minutes), with **monotony** and **strain** (Foster).
- Charts: readiness trend, acute vs chronic load, sleep duration, HRV and resting HR, soreness hotspots. Each chart has a Table toggle.

## Nutrition
- **Target calculator**: Mifflin–St Jeor BMR × activity factor, adjusted for fat loss / maintenance / muscle gain. It suggests protein in g/kg, a fat floor, carbs and water. Every target can be edited.
- **Food log** by meal, using a ~75-item database (including common hawker and café dishes), recent foods first, servings in ¼ steps, **Quick add** for custom macros (optionally saved as a food), and **Copy previous day**.
- **Water tracker** with 250 ml cups.
- **14-day adherence**: adherence score, days logged, % of days within ±10% of calories, % of days at ≥ 90% of protein, calories and protein charts against target, and average macro split.

## Body composition
- Weight, body fat %, waist, hips, chest, arm and thigh, with trend charts, goal lines and a start-vs-latest table.
- **Progress photos** (front / side / back), compressed and stored on the device, with a **before/after compare slider**.

## Client engagement
- **Client view.** Hand the iPad to your client. They get a friendly dashboard: today's readiness check-in, today's habits, nutrition and water logging, goals, strength and bodyweight charts, badges and recent workouts. An optional **4-digit PIN** stops them leaving the view.
- **Goals** for strength (estimated 1RM), bodyweight, body fat, session count or anything custom. Progress updates automatically from logged data, with deadlines and a confetti celebration when hit.
- **Habits** with weekly targets (e.g. 5/7 days), streaks and a tap-to-complete week grid.
- **16 achievement badges**: session milestones, week streaks, PR counts, tonnage clubs, check-in and nutrition streaks, goal and photo badges.
- **Shareable progress card**: a 1080×1350 image with sessions, volume lifted, PRs, bodyweight change and biggest strength gain, for the last 30 or 90 days or all time.
- **Workout summaries** sent straight to WhatsApp, iMessage or email through the share sheet.

## Data & privacy
- **Local-first.** All data is stored in IndexedDB on the device. There is no account or server, and the app works offline.
- **Backup / restore** as a single JSON file, optionally including photos.
- Persistent-storage request, a demo studio loader, erase-all, and kg/lb plus currency settings.
- **Installable PWA** with a Home Screen icon, full-screen display, iPhone notch/home-bar safe areas, and an iPad side rail layout.

---

## Roadmap: ideas that need a backend or integrations

These would move Atlas from a trainer's toolkit to a two-sided platform. They're listed roughly by impact.

1. **Accounts & cloud sync** (e.g. Supabase or Firebase). Sync between your iPhone and iPad, automatic backups, and multi-trainer studios.
2. **Client app login.** Clients log in on their own phones to do check-ins, food logs and habits at home. Every engagement feature above already exists in Client view and would carry over.
3. **Push notifications.** Check-in reminders, session reminders, habit nudges, and "new PR!" celebrations (Web Push works for installed PWAs on iOS 16.4+).
4. **In-app messaging and form-check videos.** Clients upload a set video and you reply with notes.
5. **Wearable integrations.** Pull HRV, resting HR, sleep and steps automatically from Apple Health (needs a native wrapper), Whoop, Oura, Garmin or Fitbit APIs.
6. **Payments.** Stripe checkout for packages, automatic renewals and invoices.
7. **Online booking page** that clients can self-serve, synced to Google or Apple Calendar.
8. **Program periodisation.** Multi-week programs with auto-progression rules (e.g. +2.5 kg when all reps are hit at RPE ≤ 8) and deloads triggered by readiness or ACWR.
9. **Barcode scanning and a large food database** (Open Food Facts or a commercial API) for faster food logging.
10. **AI coaching assistant.** Weekly client summaries, program suggestions, and drafted check-in replies, built on the analytics already computed here.
11. **Group classes and leaderboards** for bootcamp-style sessions.
12. **Shareable web reports** a client can open from a link, with no app install.
