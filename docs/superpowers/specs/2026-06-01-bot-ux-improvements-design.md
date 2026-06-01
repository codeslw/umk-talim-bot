# Bot UX & Business Logic Improvements

**Date:** 2026-06-01  
**Scope:** Telegram bot layer only (`src/bot/`)  
**Approach:** Option B — targeted patches + small scoped refactors

---

## 1. i18n — Fix Russian-only labels

### Problem
`formatCourseInfo` in `presenters.ts` hardcodes Russian field labels regardless of the user's selected language. `formatCourseWizardSummary` in `courseWizard.ts` is also Russian-only.

### Fix
Add new i18n key groups to all 3 locales in `bot/i18n.ts`:

- `courseInfoLabels` — field labels for the course detail card shown to users (duration, format, practice, cost, installments, age, additionalInfo)
- `courseWizardLabels` — labels used in the course wizard summary (admin-facing but built from the same helper; kept consistent)
- `confirmLabels` — labels for the application confirmation summary card shown before submission (all 13 form fields, plus confirm/cancel button text)
- `sourceOptions` — predefined options for the "where did you hear about us?" field: Instagram, friends, ad, YouTube, other

`formatCourseInfo(course, lang)` in `presenters.ts` receives `lang` and uses `TEXT[lang].courseInfoLabels` for all field labels.

`formatCourseWizardSummary` is updated to accept a `lang` parameter and use `TEXT[lang].courseWizardLabels`. Where it is called without a lang (admin context), it defaults to `'ru'`.

---

## 2. Application Form UX Improvements

### 2a. Progress indicator
Every prompt sent by `askCurrentStep` is prefixed with a step counter: `(N/13) <prompt text>`. The counter uses the current `state.step + 1` and total `STEPS.length`. No new message — it's prepended to the existing prompt string.

### 2b. Source field — inline buttons
`source` is added to `OPTION_STEPS`. Options come from `TEXT[lang].sourceOptions`. The last option ("Другое" / "Boshqa" / "Бошқа") triggers a follow-up free-text input: `source` is temporarily set to a sentinel value `'OTHER_PENDING'`, and the next message handler captures the free text as the final source value.

### 2c. Confirmation step
After the final step (`comment`), instead of calling `finishApplication` directly:
1. `formState` gets `awaitingConfirmation: true`.
2. Bot sends a summary card built by `formatApplicationSummary(data, lang)` (new function in `presenters.ts`).
3. Two inline buttons are appended: `✅ Подтвердить / Tasdiqlash / Тасдиқлаш` → `confirm_app` and `❌ Отменить / Bekor qilish / Бекор қилиш` → `cancel_app`.

**`confirm_app` callback:** calls `finishApplication(chatId)`, clears `awaitingConfirmation`.  
**`cancel_app` callback:** clears `formState`, sends main menu.  
**`/cancel` command:** already clears `formState`; no change needed — `awaitingConfirmation` is part of `formState` so it is cleared automatically.  
**Stray messages while `awaitingConfirmation` is true:** ignored (message handler returns early).

### 2d. `formatApplicationSummary(data, lang)`
New function in `presenters.ts`. Shows all 13 fields with localized labels from `TEXT[lang].confirmLabels`. Null/empty/`'-'` values are omitted. Sections:
- Personal: fullName, gender, birthDate, phone, city
- Course context: courseId is not shown; course title is resolved before calling (passed as `data.courseTitle`)
- Application: experience, workplace, specialization, learningGoal, studyFormat, studyTime, source, comment

---

## 3. Full Application Card for Admins

### Problem
`formatApplicationCard` shows only 6 fields. Admins cannot see experience, workplace, specialization, learning goal, study time, source, or comment without exporting.

### Fix
Expand `formatApplicationCard(application)` in `presenters.ts` to show all fields grouped into sections. Card stays Russian (admin-only). Empty/null fields are omitted.

**Card structure:**
```
🆔 Заявка #42
📅 01.06.2026

👤 Личные данные
Имя: ...
Пол: ...
Возраст: ... лет
Телефон: ...
Город: ...

📚 Курс
Курс: ...
Статус: ...

🎓 Профиль
Опыт: ...
Место работы: ...
Специализация: ...
Цель обучения: ...
Формат: ...
Удобное время: ...
Откуда узнали: ...

💬 Комментарий
...
```

The repository's `listApplications` already includes `user` and `course` via Prisma `include` — no query changes needed.

---

## 4. Business Logic Fixes

### 4a. Age validation against course constraints
**Problem:** `hasSavedPersonalValue` and the Joi validator both use hardcoded age range 18–45, ignoring the course's actual `ageMin`/`ageMax`.

**Fix:**
- When form state is initialized (inside the `course:` callback handler), store `courseAgeMin` and `courseAgeMax` from the fetched course object into `formState`.
- `hasSavedPersonalValue(data, step, state)` receives `state` and uses `state.courseAgeMin`/`state.courseAgeMax` for `birthDate` validation.
- In `saveAnswer` for `birthDate`, validate age against course bounds and send a localized error if out of range.
- The Joi `applicationSchema` relaxes its age range to `min(0).max(120)` — the meaningful validation has moved to the bot layer where course bounds are known.

### 4b. Sanitized error messages
**Problem:** Raw `err.message` is sent to users in at least 4 callback handlers, potentially exposing internal details.

**Fix:** Add `safeUserError(lang)` function in `bot/index.ts` returning a generic localized string (e.g. "Произошла ошибка. Попробуйте /start." / equivalent in uz/uz_lat). All user-facing catch blocks use this. Admins in admin-only handlers get one extra line of context (e.g. duplicate title) but never a raw stack message. Raw errors continue going to `logger.error`.

### 4c. `/stats` restricted to admins
**Problem:** `/stats` is a public command, leaking total application count to anyone.

**Fix:** Add `isBotAdminUser` check at the top of the `/stats` handler. Non-admins receive "Недостаточно прав." Same pattern as all other admin commands.

---

## 5. Scope Boundaries

The following are explicitly out of scope:

- HTTP API layer (`controllers/`, `routes/`, `validators/`) — no changes
- Database schema — no migrations
- `notification.service.ts` — untouched
- Structural refactor of `bot/index.ts` — stays as one file
- New npm dependencies — none added
- `/cancel` behavior — already correct; `awaitingConfirmation` is part of `formState` so it clears automatically

---

## Files Changed

| File | Changes |
|------|---------|
| `src/bot/i18n.ts` | Add `courseInfoLabels`, `courseWizardLabels`, `confirmLabels`, `sourceOptions` to all 3 locales |
| `src/bot/presenters.ts` | Fix `formatCourseInfo` lang param, expand `formatApplicationCard`, add `formatApplicationSummary` |
| `src/bot/courseWizard.ts` | Update `formatCourseWizardSummary` to accept `lang`, use i18n labels |
| `src/bot/index.ts` | Progress indicator, source as buttons + OTHER_PENDING flow, confirmation step + callbacks, dynamic age validation, `safeUserError`, `/stats` admin gate |
| `src/validators/application.validator.ts` | Relax age range to 0–120 |
