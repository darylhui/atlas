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

## Group classes (studio lesson programmes)
Built for coaches who also teach group classes at studios such as BFT, where classes run about 50 minutes, members rotate through stations against an on-screen timer, and programming arrives in multi-week blocks.

- **Classes tab.** The next class with **Teach** and **Attendance** buttons, then this week's classes, average attendance, fill rate, class pay this month, and the next 2 weeks of the timetable. Classes also appear on the Today dashboard and the Schedule, next to PT sessions.
- **Lesson programme library.** Lessons are grouped by **block and week** (e.g. "Block 12 · Week 3"), with filters by program and search across exercises. Program labels match the studio's class types (Strength, Hyper, Pump, H.I.R.T, Power, Strength Endurance, XTX, Cardio HIIT, Cardio Summit, Cardio U, CrewFit, Balanced), and you can type any name. Labels are colour-coded by resistance, conditioning, hybrid or mobility.
- **Lesson builder.** Each lesson has a title, program, block, week, session, class length, focus, equipment, floor set-up and coach notes. Add blocks in any of nine formats:
  - **Stations**: work / rest × sets per station, station-change time, laps
  - **Circuit**: everyone moves together, with rest between moves and rounds
  - **EMOM**, **AMRAP**, **Intervals**, **Tabata**, **Partner (YGIG)**, **For time** (count-up with a cap) and **Coach-led** (warm-up, demos, cool-down)
  - Per block: heart-rate **zone** target, set-up time before the next block, and notes
  - Per move: reps/time, load or RPE guidance, and regressions/progressions
  - **Paste list**: paste a programme straight from a message or document, one move per line, and "Name — reps — load" is split into fields
  - A live total vs the target length, and a strip showing the shape of the class
- **Coach sheet.** A read-only view of every block, its timing and its moves for quick reference. Share it as text with co-coaches, duplicate it to make next week's lesson, and see how often it was taught and the notes from past classes.
- **Class timer.** Full screen, made for an iPad on the floor or AirPlay-mirrored to the studio TV:
  - A huge countdown with a colour and label for each phase: work, rest, change stations, set up, coach-led
  - A station board showing every move, its target, load and regressions. The current move is highlighted in circuits and EMOMs.
  - Rotation, set, round and minute counters, heart-rate zone, and a "Next:" preview. During a set-up break the board previews the next block.
  - 3-2-1 beeps, a start tone, optional **voice cues** naming each move, and screen wake-lock
  - Play/pause, skip and back, jump to any block, a block progress bar, and keyboard shortcuts (space and arrow keys)
  - When the class finishes it can mark the class as taught
- **Class sessions.** Schedule a class (or repeat it weekly for a block) with a lesson, studio, time and capacity. **Attendance** offers autocomplete of past members and PT clients, one-tap check-in and "check in all", plus spots left, member RPE and post-class notes.
- **Studios.** Name, address, capacity and **pay per class**. Business shows classes taught, members coached and pay per studio this month. Today shows combined PT + class income.
- **PT clients who also attend classes.** Linking a client in attendance makes the class count toward their **acute:chronic workload** and attendance heatmap, and lists it on their Training tab. Their load spike shows up in Recovery even when it came from classes.
- Seven **example lessons** (one per class style, each ~50 min) show the structure. They're generic samples, not official studio programming: duplicate them or enter your own.

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
11. **Class leaderboards and member accounts.** Members log test-week results and see their own history after group classes. Bookings sync with the studio's booking system.
12. **Shareable web reports** a client can open from a link, with no app install.
