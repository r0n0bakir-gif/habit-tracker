import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
// Phase 3 (Fix 11): only new dependency permitted for Phases 1-3.
// Install: npm install html2canvas
import html2canvas from "html2canvas";

const STORAGE_KEY = "cozy-habit-tracker-dashboard";

const HEATMAP_PALETTES = {
  mint: [
    "rgba(255,255,255,0.08)",
    "rgba(126, 227, 176, 0.2)",
    "rgba(126, 227, 176, 0.38)",
    "rgba(106, 180, 255, 0.5)",
    "rgba(106, 180, 255, 0.9)",
  ],
  sunset: [
    "rgba(255,255,255,0.08)",
    "rgba(255, 178, 107, 0.18)",
    "rgba(255, 148, 112, 0.36)",
    "rgba(255, 108, 139, 0.56)",
    "rgba(255, 86, 118, 0.92)",
  ],
  violet: [
    "rgba(255,255,255,0.08)",
    "rgba(154, 140, 255, 0.18)",
    "rgba(131, 120, 255, 0.34)",
    "rgba(107, 94, 255, 0.58)",
    "rgba(93, 80, 255, 0.92)",
  ],
  amber: [
    "rgba(255,255,255,0.08)",
    "rgba(245, 205, 108, 0.16)",
    "rgba(237, 173, 88, 0.34)",
    "rgba(229, 145, 60, 0.58)",
    "rgba(224, 133, 43, 0.9)",
  ],
};

const THEME_OPTIONS = [
  { id: "green", label: "Green", swatch: "linear-gradient(135deg, #3f7f57, #78d69b)" },
  { id: "blue", label: "Blue", swatch: "linear-gradient(135deg, #3f6fd9, #78b2ff)" },
  { id: "pink", label: "Pink", swatch: "linear-gradient(135deg, #cf4f93, #f39ac7)" },
  { id: "purple", label: "Purple", swatch: "linear-gradient(135deg, #7353d8, #ab96ff)" },
  { id: "yellow", label: "Yellow", swatch: "linear-gradient(135deg, #b78b1f, #f0cb63)" },
  { id: "brown", label: "Brown", swatch: "linear-gradient(135deg, #8a5c3b, #cca07c)" },
];

const HABIT_TEMPLATES = [
  { name: "Drink water", emoji: "💧", category: "Health", goal: 4 },
  { name: "Read 20 pages", emoji: "📚", category: "Study", goal: 1 },
  { name: "Walk", emoji: "🚶", category: "Health", goal: 1 },
  { name: "Journal", emoji: "✍️", category: "Mind", goal: 1 },
  { name: "Practice German", emoji: "🇩🇪", category: "Study", goal: 1 },
  { name: "Skincare", emoji: "🧴", category: "Self-care", goal: 2 },
];

const CATEGORY_OPTIONS = ["Health", "Study", "Mind", "Self-care", "Life"];

// WHY: 20 progressive badges defined as pure data with condition functions.
// Conditions are evaluated at runtime against current stats; earned dates are
// stored permanently in localStorage so badges are never un-earned even if
// a streak later breaks. Adding 3 natural milestones (Veteran/Century/Habit Master)
// to reach the specified count of 20.
const BADGE_DEFINITIONS = [
  // ── Streak badges (7) ──
  {
    id: "streak-3",
    category: "streak",
    emoji: "🌱",
    label: "Seedling",
    description: "Reach a 3-day streak",
    hint: "Reach a 3-day streak to unlock",
    condition: ({ bestCurrentStreak }) => bestCurrentStreak >= 3,
  },
  {
    id: "streak-7",
    category: "streak",
    emoji: "🔥",
    label: "On Fire",
    description: "Reach a 7-day streak",
    hint: "Reach a 7-day streak to unlock",
    condition: ({ bestCurrentStreak }) => bestCurrentStreak >= 7,
  },
  {
    id: "streak-14",
    category: "streak",
    emoji: "💪",
    label: "Committed",
    description: "Reach a 14-day streak",
    hint: "Reach a 14-day streak to unlock",
    condition: ({ bestCurrentStreak }) => bestCurrentStreak >= 14,
  },
  {
    id: "streak-21",
    category: "streak",
    emoji: "🏅",
    label: "Veteran",
    description: "Reach a 21-day streak",
    hint: "Reach a 21-day streak to unlock",
    condition: ({ bestCurrentStreak }) => bestCurrentStreak >= 21,
  },
  {
    id: "streak-30",
    category: "streak",
    emoji: "⚡",
    label: "Unstoppable",
    description: "Reach a 30-day streak",
    hint: "Reach a 30-day streak to unlock",
    condition: ({ bestCurrentStreak }) => bestCurrentStreak >= 30,
  },
  {
    id: "streak-100",
    category: "streak",
    emoji: "🏆",
    label: "Legend",
    description: "Reach a 100-day streak",
    hint: "Reach a 100-day streak to unlock",
    condition: ({ bestCurrentStreak }) => bestCurrentStreak >= 100,
  },
  {
    id: "streak-365",
    category: "streak",
    emoji: "💎",
    label: "Diamond",
    description: "Reach a 365-day streak",
    hint: "Reach a 365-day streak to unlock",
    condition: ({ bestCurrentStreak }) => bestCurrentStreak >= 365,
  },
  // ── Completion badges (6) ──
  {
    id: "checks-1",
    category: "completion",
    emoji: "✅",
    label: "First Step",
    description: "Log your first completion",
    hint: "Complete any habit once to unlock",
    condition: ({ totalCheckIns }) => totalCheckIns >= 1,
  },
  {
    id: "checks-50",
    category: "completion",
    emoji: "🎯",
    label: "Consistent",
    description: "50 total completions",
    hint: "Reach 50 total completions to unlock",
    condition: ({ totalCheckIns }) => totalCheckIns >= 50,
  },
  {
    id: "checks-100",
    category: "completion",
    emoji: "🎖️",
    label: "Century",
    description: "100 total completions",
    hint: "Reach 100 total completions to unlock",
    condition: ({ totalCheckIns }) => totalCheckIns >= 100,
  },
  {
    id: "checks-200",
    category: "completion",
    emoji: "📈",
    label: "Momentum",
    description: "200 total completions",
    hint: "Reach 200 total completions to unlock",
    condition: ({ totalCheckIns }) => totalCheckIns >= 200,
  },
  {
    id: "checks-500",
    category: "completion",
    emoji: "🚀",
    label: "Dedicated",
    description: "500 total completions",
    hint: "Reach 500 total completions to unlock",
    condition: ({ totalCheckIns }) => totalCheckIns >= 500,
  },
  {
    id: "checks-1000",
    category: "completion",
    emoji: "🌟",
    label: "Elite",
    description: "1,000 total completions",
    hint: "Reach 1,000 total completions to unlock",
    condition: ({ totalCheckIns }) => totalCheckIns >= 1000,
  },
  // ── Variety badges (4) ──
  {
    id: "variety-3",
    category: "variety",
    emoji: "🌈",
    label: "Explorer",
    description: "Track 3 different habits",
    hint: "Track 3 habits to unlock",
    condition: ({ totalHabits }) => totalHabits >= 3,
  },
  {
    id: "variety-6",
    category: "variety",
    emoji: "🗺️",
    label: "Adventurer",
    description: "Track 6 different habits",
    hint: "Track 6 habits to unlock",
    condition: ({ totalHabits }) => totalHabits >= 6,
  },
  {
    id: "variety-10",
    category: "variety",
    emoji: "🧠",
    label: "Polymath",
    description: "Track 10 different habits",
    hint: "Track 10 habits to unlock",
    condition: ({ totalHabits }) => totalHabits >= 10,
  },
  {
    id: "variety-15",
    category: "variety",
    emoji: "✨",
    label: "Habit Master",
    description: "Track 15 different habits",
    hint: "Track 15 habits to unlock",
    condition: ({ totalHabits }) => totalHabits >= 15,
  },
  // ── Perfect day badges (3) ──
  {
    id: "perfect-1",
    category: "perfect",
    emoji: "☀️",
    label: "Perfect Day",
    description: "Complete all habits in one day",
    hint: "Have one perfect day to unlock",
    condition: ({ perfectDaysLast30 }) => perfectDaysLast30 >= 1,
  },
  {
    id: "perfect-7",
    category: "perfect",
    emoji: "🌤️",
    label: "Week Champion",
    description: "7 perfect days in a month",
    hint: "Achieve 7 perfect days to unlock",
    condition: ({ perfectDaysLast30 }) => perfectDaysLast30 >= 7,
  },
  {
    id: "perfect-30",
    category: "perfect",
    emoji: "🌞",
    label: "Master",
    description: "30 perfect days in a month",
    hint: "Achieve 30 perfect days to unlock",
    condition: ({ perfectDaysLast30 }) => perfectDaysLast30 >= 30,
  },
];

const BADGE_CATEGORY_LABELS = [
  { key: "streak",     label: "🔥 Streak Badges" },
  { key: "completion", label: "✅ Completion Badges" },
  { key: "variety",    label: "🌈 Variety Badges" },
  { key: "perfect",    label: "☀️ Perfect Day Badges" },
];

// WHY: html2canvas cannot read CSS custom properties at capture time, so share
// cards must use hard-coded colour values keyed to the active theme.
const THEME_SHARE_COLORS = {
  green:  { bg: "#0d1b13", card: "#162b1e", accent: "#78d69b", dim: "#3f7f57", text: "#e8f5ee" },
  blue:   { bg: "#0d1322", card: "#162035", accent: "#78b2ff", dim: "#3f6fd9", text: "#e8eeff" },
  pink:   { bg: "#1f0d18", card: "#2f1225", accent: "#f39ac7", dim: "#cf4f93", text: "#ffecf5" },
  purple: { bg: "#150d22", card: "#201530", accent: "#ab96ff", dim: "#7353d8", text: "#f0ecff" },
  yellow: { bg: "#1a1508", card: "#271f0c", accent: "#f0cb63", dim: "#b78b1f", text: "#fff8e0" },
  brown:  { bg: "#180e08", card: "#261611", accent: "#cca07c", dim: "#8a5c3b", text: "#fff0e5" },
};

// ─────────────────────────────────────────────────────────────
// Phase 2 constants
// ─────────────────────────────────────────────────────────────

// WHY: Mon-first order (index 0 = Monday) matches the heatmap weekday labels
// and is more intuitive for most locales than JS Date's 0 = Sunday.
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DEFAULT_SCHEDULE = { type: "daily", days: [], timesPerWeek: 3 };

const DEFAULT_REMINDER_PREFS = {
  enabled: false,
  time: "20:00",         // 8 PM default
  snoozedUntil: null,    // ISO string | null
  lastFiredDate: null,   // YYYY-MM-DD | null — prevents double-fire on same day
};

// ─────────────────────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────────────────────

const pad = (value) => String(value).padStart(2, "0");

// WHY: YYYY-MM-DD string keys prevent timezone ambiguity caused by
// toDateString() which is locale-sensitive and can shift days near midnight.
const toDateKey = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const dateFromKey = (dateKey) => new Date(`${dateKey}T12:00:00`);

const addDays = (date, amount) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

const getYesterdayKey = () => toDateKey(addDays(new Date(), -1));

const createId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const formatDisplayDate = (dateKey) =>
  dateFromKey(dateKey).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

const formatWeekday = (dateKey) =>
  dateFromKey(dateKey).toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2);

const formatDateTime = (isoString) =>
  new Date(isoString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const formatShortDate = (isoString) =>
  new Date(isoString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

const getDateRange = (days) =>
  Array.from({ length: days }, (_, index) => {
    const date = addDays(new Date(), -(days - 1 - index));
    return toDateKey(date);
  });

const getHabitCountForDate = (logs, dateKey, habitId) => logs?.[dateKey]?.[habitId] || 0;

const isHabitCompleteForDate = (habit, logs, dateKey) =>
  getHabitCountForDate(logs, dateKey, habit.id) >= habit.goal;

// WHY: Convert JS Date.getDay() (0 = Sunday) → 0 = Monday index so day toggles
// in the UI match the Mon-first heatmap column labels exactly.
const getDayOfWeek = (date) => (date.getDay() + 6) % 7;

// WHY: Determines whether a habit is due on a specific calendar date,
// respecting its schedule type. Falls back to "daily" for legacy habits
// that have no schedule field (backward-compatible).
const isHabitScheduledOnDate = (habit, date) => {
  const schedule = habit.schedule;
  if (!schedule || schedule.type === "daily") return true;
  if (schedule.type === "specific_days") {
    return (schedule.days || []).includes(getDayOfWeek(date));
  }
  // times_per_week: habit is available every day; completion is tracked weekly
  return true;
};

const getScheduleLabel = (schedule) => {
  if (!schedule || schedule.type === "daily") return "Every day";
  if (schedule.type === "specific_days") {
    const sorted = [...(schedule.days || [])].sort((a, b) => a - b);
    return sorted.length ? sorted.map((d) => DAY_NAMES[d]).join(", ") : "No days set";
  }
  if (schedule.type === "times_per_week") {
    return `${schedule.timesPerWeek || 1}× per week`;
  }
  return "Every day";
};

// WHY: For specific_days habits two completion dates are "consecutive" (no broken streak)
// if there are no scheduled-and-missed days between them.
const hasNoMissedScheduledDays = (habit, logs, dateKey1, dateKey2) => {
  let cursor = addDays(dateFromKey(dateKey1), 1);
  const end = dateFromKey(dateKey2);
  while (cursor < end) {
    if (isHabitScheduledOnDate(habit, cursor) && !isHabitCompleteForDate(habit, logs, toDateKey(cursor))) {
      return false;
    }
    cursor = addDays(cursor, 1);
  }
  return true;
};

// ── Streak calculation (Fix 7) ──
// TIMEZONE APPROACH: All date comparisons use YYYY-MM-DD keys produced by
// toDateKey(), which derives from the user's LOCAL clock via getFullYear() /
// getMonth() / getDate(). We never use toDateString() (locale-sensitive) or
// UTC methods (shifts the day near midnight for non-UTC timezones).
//
// GRACE PERIOD: If today's habit isn't logged yet, the streak from yesterday
// is still technically alive — the user has until midnight. We start counting
// from yesterday so the streak badge doesn't show 0 all day.
//
// SCHEDULE-AWARE: specific_days habits skip non-scheduled days; times_per_week
// habits report completions in the current rolling 7-day window.

const getHabitCurrentStreak = (habit, logs) => {
  const schedule = habit.schedule;
  const todayKey = toDateKey();

  if (schedule?.type === "specific_days") {
    let streak = 0;
    let cursor = new Date();
    // Safety limit: stop after 400 days to avoid infinite loops on malformed data
    for (let guard = 0; guard < 400; guard += 1) {
      const dateKey = toDateKey(cursor);
      const scheduled = isHabitScheduledOnDate(habit, cursor);
      const completed = isHabitCompleteForDate(habit, logs, dateKey);
      const isToday = dateKey === todayKey;

      if (scheduled) {
        if (completed) {
          streak += 1;
        } else if (isToday) {
          // Grace period: today not logged yet — don't break streak
        } else {
          break; // Missed a scheduled day → streak broken
        }
      }
      // Non-scheduled day: skip, don't break streak

      cursor = addDays(cursor, -1);
    }
    return streak;
  }

  if (schedule?.type === "times_per_week") {
    // WHY: For X/week habits the meaningful metric is completions in the
    // current rolling 7-day window vs the weekly target.
    const weekDays = Array.from({ length: 7 }, (_, i) => toDateKey(addDays(new Date(), -i)));
    return weekDays.filter((dk) => isHabitCompleteForDate(habit, logs, dk)).length;
  }

  // Daily schedule — with grace period
  let streak = 0;
  let cursor = new Date();
  if (!isHabitCompleteForDate(habit, logs, toDateKey(cursor))) {
    // Grace period: count from yesterday while today is still open
    cursor = addDays(cursor, -1);
  }
  while (isHabitCompleteForDate(habit, logs, toDateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
};

const getHabitBestStreak = (habit, logs) => {
  const schedule = habit.schedule;

  if (schedule?.type === "times_per_week") {
    // WHY: Best streak = highest completions count in any 7-day rolling window.
    const allDates = Object.keys(logs || {}).sort();
    if (!allDates.length) return 0;
    let best = 0;
    allDates.forEach((anchor) => {
      const count = Array.from({ length: 7 }, (_, i) => toDateKey(addDays(dateFromKey(anchor), i)))
        .filter((dk) => isHabitCompleteForDate(habit, logs, dk)).length;
      best = Math.max(best, count);
    });
    return best;
  }

  // For specific_days: filter to scheduled completion dates only, then check
  // for gaps using hasNoMissedScheduledDays.
  // For daily: original diff===1 logic.
  const completeDates = Object.keys(logs || {})
    .filter((dateKey) => {
      if (schedule?.type === "specific_days") {
        return (
          isHabitScheduledOnDate(habit, dateFromKey(dateKey)) &&
          isHabitCompleteForDate(habit, logs, dateKey)
        );
      }
      return isHabitCompleteForDate(habit, logs, dateKey);
    })
    .sort((a, b) => dateFromKey(a) - dateFromKey(b));

  if (!completeDates.length) return 0;

  let best = 1;
  let current = 1;

  for (let index = 1; index < completeDates.length; index += 1) {
    const prev = completeDates[index - 1];
    const curr = completeDates[index];

    let consecutive;
    if (schedule?.type === "specific_days") {
      // WHY: Two completion dates are consecutive if no scheduled day between them was missed.
      consecutive = hasNoMissedScheduledDays(habit, logs, prev, curr);
    } else {
      const diff = Math.round((dateFromKey(curr) - dateFromKey(prev)) / 86400000);
      consecutive = diff === 1;
    }

    if (consecutive) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }

  return best;
};

const getHabitTotalChecks = (habit, logs) =>
  Object.keys(logs || {}).reduce(
    (sum, dateKey) => sum + Math.min(getHabitCountForDate(logs, dateKey, habit.id), habit.goal),
    0
  );

const getHeatmapCellStyle = (paletteKey, intensity) => ({
  background:
    (HEATMAP_PALETTES[paletteKey] || HEATMAP_PALETTES.mint)[intensity] ||
    HEATMAP_PALETTES.mint[0],
});

const getWeeklyHeatmapColumns = (days) => {
  const columns = [];

  for (let index = 0; index < days.length; index += 7) {
    columns.push(days.slice(index, index + 7));
  }

  return columns;
};

// WHY: Single write path — all localStorage persistence flows through here.
// Never call localStorage.setItem directly from a component (makes future
// storage adapters, encryption, or cloud sync a one-file change).
const saveHabits = (data) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

// WHY: Forward-compatible schema migration runs on every load.
// Phase 1: added `unit` field (default "").
// Phase 2: added `schedule` field (default DEFAULT_SCHEDULE = every day).
// Old fields lose to spread so a pre-existing value is never clobbered.
const migrateStorage = (data) => {
  if (Array.isArray(data.habits)) {
    data.habits = data.habits.map((habit) => ({
      unit: "",
      schedule: DEFAULT_SCHEDULE,
      ...habit,
    }));
  }
  return data;
};

const getInitialData = () => {
  const defaults = {
    habits: [
      { id: createId(), name: "Drink water", emoji: "💧", category: "Health", goal: 4, unit: "glasses",  schedule: DEFAULT_SCHEDULE },
      { id: createId(), name: "Read",         emoji: "📚", category: "Study",  goal: 1, unit: "chapters", schedule: DEFAULT_SCHEDULE },
      { id: createId(), name: "Stretch",      emoji: "🧘", category: "Health", goal: 1, unit: "",          schedule: DEFAULT_SCHEDULE },
      { id: createId(), name: "Journal",      emoji: "✍️", category: "Mind",   goal: 1, unit: "",          schedule: DEFAULT_SCHEDULE },
    ],
    logs: {},
    activityLog: [],
    darkMode: true,
    colorTheme: "green",
    heatmapPalette: "mint",
    // Phase 1 additions ↓
    warningDismissedAt: null,
    earnedBadges: {},
    // Phase 2 additions ↓
    reminderPrefs: DEFAULT_REMINDER_PREFS,
  };

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    const merged = { ...defaults, ...parsed };
    return migrateStorage(merged); // upgrade old records in place
  } catch {
    return defaults;
  }
};

// ─────────────────────────────────────────────────────────────
// App component
// ─────────────────────────────────────────────────────────────

export default function App() {
  const initial = getInitialData();
  const today = toDateKey();

  // ── Existing state ──
  const [habits, setHabits] = useState(initial.habits);
  const [logs, setLogs] = useState(initial.logs);
  const [activityLog, setActivityLog] = useState(initial.activityLog || []);
  const [darkMode, setDarkMode] = useState(initial.darkMode);
  const [colorTheme, setColorTheme] = useState(initial.colorTheme || "green");
  const [heatmapPalette, setHeatmapPalette] = useState(initial.heatmapPalette || "mint");

  const [habitName, setHabitName] = useState("");
  const [habitEmoji, setHabitEmoji] = useState("✨");
  const [habitGoal, setHabitGoal] = useState(1);
  const [habitCategory, setHabitCategory] = useState("Life");
  const [bannerMessage, setBannerMessage] = useState("");

  // ── Phase 1 state ──
  const [warningDismissedAt, setWarningDismissedAt] = useState(initial.warningDismissedAt || null);
  const [earnedBadges, setEarnedBadges] = useState(initial.earnedBadges || {});
  const [editingHabit, setEditingHabit] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", emoji: "", goal: 1, unit: "", schedule: DEFAULT_SCHEDULE });
  const [importModalState, setImportModalState] = useState({ open: false, pendingData: null, newCount: 0 });
  const [deletingHabitId, setDeletingHabitId] = useState(null);
  const [badgeJustUnlocked, setBadgeJustUnlocked] = useState(null);

  // ── Phase 2 state ──
  const [habitUnit, setHabitUnit] = useState("");
  const [habitSchedule, setHabitSchedule] = useState(DEFAULT_SCHEDULE);
  const [reminderPrefs, setReminderPrefs] = useState(initial.reminderPrefs || DEFAULT_REMINDER_PREFS);
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [showReminderSettings, setShowReminderSettings] = useState(false);
  const [showInAppReminder, setShowInAppReminder] = useState(false);

  // ── Phase 3 state ──
  // WHY: installPrompt holds the beforeinstallprompt event so we can call
  // .prompt() later from the Install button. Set to null after install.
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );
  const [activeSection, setActiveSection] = useState("today");
  const [shareHabit, setShareHabit] = useState(null);       // habit being captured
  const [shareGenerating, setShareGenerating] = useState(false);

  // ── Refs ──
  const importInputRef = useRef(null);
  // WHY: shareCardRef points to the off-screen 800×400 div that html2canvas captures.
  // It must be in the DOM (position: fixed; left: -9999px) so html2canvas can
  // measure dimensions and compute computed styles correctly.
  const shareCardRef = useRef(null);

  // WHY: Track which habit card the mouse is hovering so the E-key shortcut
  // knows which habit to open — without putting hover state in React state
  // (which would cause re-renders on every mouse move over the list).
  const hoveredHabitIdRef = useRef(null);

  // WHY: earnedBadgesRef lets the badge-unlock effect read the latest value of
  // earnedBadges without listing it as a dependency, which would create an
  // infinite loop (effect → setEarnedBadges → re-run effect → …).
  const earnedBadgesRef = useRef(earnedBadges);
  useEffect(() => { earnedBadgesRef.current = earnedBadges; });

  // WHY: These three refs allow the notification interval (registered once with
  // empty deps) to always read the latest values without re-registering the
  // setInterval on every render. Pattern: state changes → ref syncs → interval
  // reads ref on next tick.
  const reminderPrefsRef = useRef(reminderPrefs);
  const overallProgressRef = useRef(0);
  const bestStreakRef = useRef(0);
  useEffect(() => { reminderPrefsRef.current = reminderPrefs; });
  // overallProgressRef and bestStreakRef are synced further down, after those
  // derived values are computed.

  // ── Persist all state to localStorage via saveHabits ──
  useEffect(() => {
    saveHabits({
      habits,
      logs,
      activityLog,
      darkMode,
      colorTheme,
      heatmapPalette,
      warningDismissedAt,
      earnedBadges,
      reminderPrefs, // Phase 2
    });
  }, [habits, logs, activityLog, darkMode, colorTheme, heatmapPalette, warningDismissedAt, earnedBadges, reminderPrefs]);

  // ── Keyboard shortcuts: Escape closes modals, E opens edit ──
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Escape: close whichever modal is open
      if (event.key === "Escape") {
        if (editingHabit) { setEditingHabit(null); return; }
        if (importModalState.open) { setImportModalState({ open: false, pendingData: null, newCount: 0 }); return; }
        if (deletingHabitId) { setDeletingHabitId(null); return; }
      }

      // E key: open edit for the currently-hovered habit card
      // WHY: Guard against firing while the user is typing in a form field.
      const activeTag = document.activeElement?.tagName;
      const isTyping = activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT";
      const anyModalOpen = !!editingHabit || importModalState.open || !!deletingHabitId;

      if (
        (event.key === "e" || event.key === "E") &&
        !event.ctrlKey && !event.metaKey && !event.altKey &&
        !isTyping && !anyModalOpen
      ) {
        const id = hoveredHabitIdRef.current;
        if (id) {
          const habit = habits.find((h) => h.id === id);
          if (habit) {
            setEditingHabit(habit);
            setEditForm({ name: habit.name, emoji: habit.emoji, goal: habit.goal, unit: habit.unit || "", schedule: habit.schedule || DEFAULT_SCHEDULE });
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [habits, editingHabit, importModalState.open, deletingHabitId]);

  // ─────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────

  const pushMessage = (message) => {
    setBannerMessage(message);
    window.clearTimeout(pushMessage.timeout);
    pushMessage.timeout = window.setTimeout(() => setBannerMessage(""), 2800);
  };

  const addActivity = (entry) => {
    setActivityLog((prev) => [entry, ...prev].slice(0, 180));
  };

  const addHabit = (habitDraft) => {
    const trimmedName = habitDraft.name.trim();
    if (!trimmedName) return;

    const newHabit = {
      id: createId(),
      name: trimmedName,
      emoji: habitDraft.emoji.trim() || "✨",
      category: habitDraft.category || "Life",
      goal: Number(habitDraft.goal) || 1,
      unit: habitDraft.unit?.trim() || "",
      schedule: habitDraft.schedule || DEFAULT_SCHEDULE, // Phase 2
    };

    setHabits((prev) => [newHabit, ...prev]);
    setHabitName("");
    setHabitEmoji("✨");
    setHabitGoal(1);
    setHabitCategory("Life");
    setHabitUnit("");              // Phase 2
    setHabitSchedule(DEFAULT_SCHEDULE); // Phase 2
    pushMessage(`Added ${newHabit.emoji} ${newHabit.name}`);
  };

  const removeHabit = (habitId) => {
    const target = habits.find((habit) => habit.id === habitId);
    setHabits((prev) => prev.filter((habit) => habit.id !== habitId));
    setLogs((prev) => {
      const next = {};

      Object.entries(prev).forEach(([dateKey, dayValues]) => {
        const updatedDay = { ...dayValues };
        delete updatedDay[habitId];
        if (Object.keys(updatedDay).length) {
          next[dateKey] = updatedDay;
        }
      });

      return next;
    });

    if (target) {
      pushMessage(`Removed ${target.name}`);
    }
  };

  const setHabitCount = (habit, nextCount) => {
    const clampedCount = Math.max(0, Math.min(habit.goal, nextCount));
    const currentCount = getHabitCountForDate(logs, today, habit.id);
    if (clampedCount === currentCount) return;

    setLogs((prev) => {
      const next = { ...prev };
      const dayValues = { ...(next[today] || {}) };

      if (clampedCount <= 0) {
        delete dayValues[habit.id];
      } else {
        dayValues[habit.id] = clampedCount;
      }

      if (Object.keys(dayValues).length) {
        next[today] = dayValues;
      } else {
        delete next[today];
      }

      return next;
    });

    if (clampedCount > currentCount) {
      const reachedGoal = currentCount < habit.goal && clampedCount >= habit.goal;
      addActivity({
        id: createId(),
        type: reachedGoal ? "complete" : "checkin",
        habitId: habit.id,
        habitName: habit.name,
        emoji: habit.emoji,
        amount: clampedCount,
        createdAt: new Date().toISOString(),
      });

      if (reachedGoal) {
        pushMessage(`${habit.emoji} ${habit.name} completed for today`);
      }
    }
  };

  const toggleHabitDone = (habit) => {
    const doneToday = isHabitCompleteForDate(habit, logs, today);
    setHabitCount(habit, doneToday ? 0 : habit.goal);
  };

  // ── Edit modal ──

  const openEditModal = (habit) => {
    setEditingHabit(habit);
    setEditForm({ name: habit.name, emoji: habit.emoji, goal: habit.goal, unit: habit.unit || "", schedule: habit.schedule || DEFAULT_SCHEDULE });
  };

  const closeEditModal = () => setEditingHabit(null);

  const saveEditHabit = () => {
    const trimmedName = editForm.name.trim();

    if (!trimmedName) {
      pushMessage("❌ Habit name can't be empty.");
      return;
    }

    const duplicate = habits.find(
      (h) => h.name.toLowerCase() === trimmedName.toLowerCase() && h.id !== editingHabit.id
    );
    if (duplicate) {
      pushMessage("❌ You already have a habit with this name.");
      return;
    }

    setHabits((prev) =>
      prev.map((h) =>
        h.id === editingHabit.id
          ? {
              ...h,
              name: trimmedName,
              emoji: editForm.emoji.trim() || h.emoji,
              goal: Math.max(1, Number(editForm.goal) || 1),
              unit: editForm.unit.trim(),
              schedule: editForm.schedule || DEFAULT_SCHEDULE, // Phase 2
            }
          : h
      )
    );

    pushMessage(`✏️ ${trimmedName} updated.`);
    closeEditModal();
  };

  // ── Export ──

  const exportJSON = () => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      habits,
      logs,
      activityLog,
      earnedBadges,
      settings: { darkMode, colorTheme, heatmapPalette },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `habit-backup-${toDateKey()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    pushMessage("✅ Backup saved. Store it somewhere safe!");
  };

  const exportCSV = () => {
    // WHY: streak_at_time reflects the CURRENT streak, not the historical value
    // at each log date — computing true historical streaks would require O(n²)
    // work. This is documented in the header row.
    const rows = [
      "habit_name,date,completed,count,streak_at_time(current)",
    ];

    habits.forEach((habit) => {
      const currentStreak = getHabitCurrentStreak(habit, logs);
      Object.keys(logs)
        .sort()
        .forEach((dateKey) => {
          const count = getHabitCountForDate(logs, dateKey, habit.id);
          if (count > 0) {
            const completed = count >= habit.goal;
            rows.push(`"${habit.name.replace(/"/g, '""')}",${dateKey},${completed},${count},${currentStreak}`);
          }
        });
    });

    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `habit-history-${toDateKey()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    pushMessage("✅ CSV exported.");
  };

  // ── Import ──

  const handleImportFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);

        // Schema validation
        if (
          typeof data.version !== "number" ||
          !Array.isArray(data.habits) ||
          typeof data.exportedAt !== "string"
        ) {
          pushMessage(
            "❌ Invalid backup. Expected: { version, exportedAt, habits: [...] }"
          );
          return;
        }

        // Count only habits that aren't already in the library (merge-by-name)
        const newHabits = data.habits.filter(
          (h) => !habits.some((existing) => existing.name.toLowerCase() === h.name.toLowerCase())
        );

        setImportModalState({ open: true, pendingData: data, newCount: newHabits.length });
      } catch {
        pushMessage("❌ Could not parse file. Is it a valid JSON backup?");
      }
    };

    reader.readAsText(file);
    // WHY: Reset so the same file can be selected again in the same session.
    event.target.value = "";
  };

  const confirmImport = () => {
    const { pendingData } = importModalState;
    if (!pendingData) return;

    const newHabits = pendingData.habits
      .filter(
        (h) => !habits.some((existing) => existing.name.toLowerCase() === h.name.toLowerCase())
      )
      .map((h) => ({
        unit: "",
        ...h,
        id: createId(), // WHY: always assign a fresh id to avoid collisions
      }));

    setHabits((prev) => [...prev, ...newHabits]);
    setImportModalState({ open: false, pendingData: null, newCount: 0 });
    pushMessage(`✅ Imported ${newHabits.length} habit${newHabits.length !== 1 ? "s" : ""}.`);
  };

  const closeImportModal = () =>
    setImportModalState({ open: false, pendingData: null, newCount: 0 });

  // ── Phase 3 handlers ──

  const handleInstallClick = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    // WHY: userChoice resolves once the user accepts or dismisses. Either way
    // we clear the prompt — it can only be called once per event.
    installPrompt.userChoice.then(() => setInstallPrompt(null));
  };

  // WHY: scrollIntoView alone doesn't account for sticky headers.
  // The CSS scroll-margin-top on each section id compensates for the
  // combined height of topbar + section nav.
  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const generateShareCard = (habit) => {
    if (shareGenerating) return;
    setShareHabit(habit); // triggers the share-card useEffect
  };

  // ── Phase 2 handlers ──

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      pushMessage("❌ Your browser doesn't support notifications.");
      return;
    }
    const result = await Notification.requestPermission();
    setNotifPermission(result);
    if (result === "granted") {
      pushMessage(`✅ Notifications enabled! Reminder set for ${reminderPrefs.time}.`);
      // Register SW now so showNotification() will work
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      }
    } else if (result === "denied") {
      pushMessage("ℹ️ Notifications blocked. An in-app banner will appear after 5 PM instead.");
    }
  };

  const snoozeInAppReminder = () => {
    setReminderPrefs((prev) => ({
      ...prev,
      snoozedUntil: new Date(Date.now() + 3_600_000).toISOString(), // +1 hour
    }));
    setShowInAppReminder(false);
    pushMessage("⏰ Reminder snoozed for 1 hour.");
  };

  const dismissInAppReminder = () => {
    setReminderPrefs((prev) => ({ ...prev, lastFiredDate: toDateKey() }));
    setShowInAppReminder(false);
  };

  // ── Phase 2 effects ──

  // WHY: Streak integrity check — runs once on mount. Since streaks are derived
  // from logs (not stored separately), this validates the computation is sane
  // and warns if currentStreak > bestStreak, which can indicate a timezone bug.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    habits.forEach((habit) => {
      const current = getHabitCurrentStreak(habit, logs);
      const best = getHabitBestStreak(habit, logs);
      if (current > best + 1) {
        console.warn(
          `[Habit Tracker] Streak integrity: "${habit.name}" current (${current}) > best (${best}). ` +
          "Possible timezone shift — best will self-correct on next completion."
        );
      }
    });
  }, []); // Intentionally run once on mount with initial snapshot

  // WHY: Register the service worker on load so it can handle notification
  // action clicks (e.g. Snooze). Fails silently if sw.js isn't served from root,
  // which can happen in some dev setups — notifications fall back to new Notification().
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("[Habit Tracker] SW registration failed:", err.message,
          "— place sw.js at your server root. Notifications will still work without action buttons.");
      });
    }
  }, []);

  // WHY: Listen for messages the SW sends back (e.g. the Snooze action click).
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (event) => {
      if (event.data?.type === "SNOOZE_NOTIFICATION") {
        setReminderPrefs((prev) => ({
          ...prev,
          snoozedUntil: new Date(Date.now() + 3_600_000).toISOString(),
        }));
        setShowInAppReminder(false);
        pushMessage("⏰ Reminder snoozed for 1 hour.");
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // WHY: Empty-deps interval + refs pattern: the interval is registered once and
  // reads the latest state via refs on each tick, avoiding re-registration on
  // every render while still reacting to state changes.
  useEffect(() => {
    const sendRealNotification = async (title, body) => {
      try {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(title, {
          body,
          icon: "/icon-192.png",
          actions: [{ action: "snooze", title: "Snooze 1 hour" }],
          tag: "habit-reminder", // replaces any previous reminder notification
        });
      } catch {
        // Fallback: direct Notification (no action buttons available)
        if (Notification.permission === "granted") new Notification(title, { body });
      }
    };

    const tick = () => {
      const prefs = reminderPrefsRef.current;
      if (!prefs.enabled) { setShowInAppReminder(false); return; }

      const now = new Date();
      const todayKey = toDateKey();
      const isSnoozed = prefs.snoozedUntil && new Date(prefs.snoozedUntil) > now;
      const firedToday = prefs.lastFiredDate === todayKey;

      // In-app fallback banner: after 5 PM, notifications not granted, not done yet
      if (
        Notification.permission !== "granted" &&
        now.getHours() >= 17 &&
        overallProgressRef.current < 100 &&
        !isSnoozed &&
        !firedToday
      ) {
        setShowInAppReminder(true);
      } else {
        setShowInAppReminder(false);
      }

      // Real notification at the scheduled time
      if (Notification.permission === "granted" && !firedToday && !isSnoozed) {
        const [h, m] = (prefs.time || "20:00").split(":").map(Number);
        if (now.getHours() === h && now.getMinutes() === m) {
          const streak = bestStreakRef.current;
          sendRealNotification(
            "🔥 Habit check-in!",
            streak > 0
              ? `You're on a ${streak}-day streak — don't break it today.`
              : "Time to check in on your habits!"
          );
          setReminderPrefs((prev) => ({ ...prev, lastFiredDate: todayKey, snoozedUntil: null }));
        }
      }
    };

    tick(); // Run immediately so the banner shows without waiting 60 s
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Phase 3 effects ──

  // Fix 9: PWA install prompt capture
  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setInstallPrompt(e); };
    const onInstalled = () => { setInstallPrompt(null); pushMessage("✅ App installed!"); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fix 9: Online / offline indicator
  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline  = () => setIsOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online",  goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online",  goOnline);
    };
  }, []);

  // Fix 10: IntersectionObserver — highlights the active section tab as user scrolls.
  // WHY: rootMargin "-110px 0px -55% 0px" means a section is "active" when its top
  // edge enters the upper 45% of the viewport (below the ~110px sticky headers).
  // Sections are observed in reverse DOM order so the topmost visible one wins.
  useEffect(() => {
    const ids = ["badges", "streaks", "stats", "today"]; // bottom-to-top priority
    const observers = ids.map((id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { threshold: 0, rootMargin: "-110px 0px -55% 0px" }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach((obs) => obs?.disconnect());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fix 11: Share card generation — runs when shareHabit is set.
  // WHY: A 150ms delay gives React one paint cycle to render the off-screen
  // share card div before html2canvas measures it.
  useEffect(() => {
    if (!shareHabit || !shareCardRef.current) return;
    setShareGenerating(true);

    const timerId = window.setTimeout(async () => {
      const sc = THEME_SHARE_COLORS[colorTheme] || THEME_SHARE_COLORS.green;
      try {
        const canvas = await html2canvas(shareCardRef.current, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: sc.bg, // WHY: explicit bg so the card is opaque on all devices
          width: 800,
          height: 400,
        });

        const safeFilename = `${shareHabit.name.replace(/\W+/g, "-").toLowerCase()}-habit-${toDateKey()}.png`;
        const dataUrl = canvas.toDataURL("image/png");

        // Prefer native share (mobile) → fall back to download (desktop)
        let shared = false;
        if (navigator.canShare) {
          await new Promise((resolve) => {
            canvas.toBlob(async (blob) => {
              const file = new File([blob], safeFilename, { type: "image/png" });
              if (navigator.canShare({ files: [file] })) {
                try {
                  await navigator.share({
                    files: [file],
                    title: `${shareHabit.emoji} ${shareHabit.name} — Habit Tracker`,
                    text: `🔥 ${shareHabit.currentStreak} day streak · ✅ ${shareHabit.totalChecks} total check-ins`,
                  });
                  pushMessage("📤 Shared!");
                  shared = true;
                } catch {
                  // User cancelled — fall through to download
                }
              }
              resolve();
            });
          });
        }

        if (!shared) {
          const a = document.createElement("a");
          a.href = dataUrl;
          a.download = safeFilename;
          a.click();
          pushMessage("⬇ Share card downloaded!");
        }
      } catch (err) {
        console.error("[ShareCard] html2canvas failed:", err);
        pushMessage("❌ Couldn't generate share image. Is html2canvas installed?");
      } finally {
        setShareGenerating(false);
        setShareHabit(null);
      }
    }, 150);

    return () => window.clearTimeout(timerId);
  }, [shareHabit]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────
  // Derived / memoized values
  // ─────────────────────────────────────────────────────────────

  const habitsWithStats = useMemo(() => {
    return habits
      .map((habit) => {
        const todayCount = getHabitCountForDate(logs, today, habit.id);
        const currentStreak = getHabitCurrentStreak(habit, logs);
        const bestStreak = getHabitBestStreak(habit, logs);
        const totalChecks = getHabitTotalChecks(habit, logs);
        const recentWindow = getDateRange(7);
        const recentCompletions = recentWindow.filter((dateKey) =>
          isHabitCompleteForDate(habit, logs, dateKey)
        ).length;
        // Phase 2: schedule fields
        const isDueToday = isHabitScheduledOnDate(habit, new Date());
        const scheduleLabel = getScheduleLabel(habit.schedule);

        return {
          ...habit,
          todayCount,
          doneToday: todayCount >= habit.goal,
          progressPercent: Math.min(100, (todayCount / habit.goal) * 100),
          currentStreak,
          bestStreak,
          totalChecks,
          weeklyRate: Math.round((recentCompletions / 7) * 100),
          isDueToday,
          scheduleLabel,
        };
      })
      .sort((a, b) => {
        // WHY: Due-today habits sort first; within that, incomplete before done,
        // then by streak depth.
        if (a.isDueToday !== b.isDueToday) return Number(b.isDueToday) - Number(a.isDueToday);
        return Number(a.doneToday) - Number(b.doneToday) || b.currentStreak - a.currentStreak;
      });
  }, [habits, logs, today]);

  const totalHabits = habitsWithStats.length;
  // WHY: Only count habits that are due today so a Mon-Wed-Fri habit on Tuesday
  // doesn't make the progress ring show incomplete. totalHabits still counts all
  // habits for badge conditions and category displays.
  const habitsDueToday = habitsWithStats.filter((h) => h.isDueToday);
  const completedTodayHabits = habitsDueToday.filter((h) => h.doneToday).length;
  const totalChecksToday = habitsDueToday.reduce(
    (sum, h) => sum + Math.min(h.todayCount, h.goal),
    0
  );
  const totalTargetToday = habitsDueToday.reduce((sum, h) => sum + h.goal, 0);
  const overallProgressPercent = totalTargetToday
    ? Math.round((totalChecksToday / totalTargetToday) * 100)
    : 0;

  const ringRadius = 122;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (overallProgressPercent / 100) * ringCircumference;

  const weeklyActivity = useMemo(() => {
    return getDateRange(7).map((dateKey) => {
      const dateObj = dateFromKey(dateKey);
      // WHY: Only count habits that were due on that specific day — a habit
      // scheduled Mon/Wed/Fri shouldn't create a gap in the Tuesday bar.
      const dueHabits = habitsWithStats.filter((h) => isHabitScheduledOnDate(h, dateObj));
      const completed = dueHabits.filter((h) => isHabitCompleteForDate(h, logs, dateKey)).length;
      const dueCount = Math.max(dueHabits.length, 1);

      return {
        key: dateKey,
        label: formatWeekday(dateKey),
        value: completed,
        display: `${completed}/${dueCount}`,
        isToday: dateKey === today,
      };
    });
  }, [habitsWithStats, logs, today]);

  const weeklyPeak = Math.max(...weeklyActivity.map((day) => day.value), 1);

  const heatmapDays = useMemo(() => {
    return getDateRange(84).map((dateKey) => {
      const dateObj = dateFromKey(dateKey);
      // WHY: Each day uses only the habits that were due on that day as the
      // target, so a specific_days habit doesn't paint past days red unfairly.
      const dueHabits = habitsWithStats.filter((h) => isHabitScheduledOnDate(h, dateObj));
      const isNonScheduled = dueHabits.length === 0;
      const targetPerDay = Math.max(dueHabits.reduce((s, h) => s + h.goal, 0), 1);

      const value = dueHabits.reduce(
        (sum, habit) => sum + Math.min(getHabitCountForDate(logs, dateKey, habit.id), habit.goal),
        0
      );

      let intensity = 0;
      if (!isNonScheduled) {
        if (value > 0) intensity = 1;
        if (value >= targetPerDay * 0.33) intensity = 2;
        if (value >= targetPerDay * 0.66) intensity = 3;
        if (value >= targetPerDay) intensity = 4;
      }

      return {
        key: dateKey,
        label: formatDisplayDate(dateKey),
        value,
        intensity,
        isToday: dateKey === today,
        isNonScheduled,
      };
    });
  }, [habitsWithStats, logs, today]);

  const heatmapColumns = useMemo(() => getWeeklyHeatmapColumns(heatmapDays), [heatmapDays]);

  const perfectDaysLast30 = useMemo(() => {
    if (!totalHabits) return 0;

    return getDateRange(30).filter((dateKey) => {
      const dateObj = dateFromKey(dateKey);
      // WHY: A "perfect day" means every habit DUE that day was completed.
      // A day with no habits due at all doesn't count as perfect.
      const dueHabits = habitsWithStats.filter((h) => isHabitScheduledOnDate(h, dateObj));
      if (!dueHabits.length) return false;
      return dueHabits.every((h) => isHabitCompleteForDate(h, logs, dateKey));
    }).length;
  }, [habitsWithStats, logs, totalHabits]);

  const totalCheckIns = useMemo(
    () => habitsWithStats.reduce((sum, habit) => sum + habit.totalChecks, 0),
    [habitsWithStats]
  );

  const strongestHabit = habitsWithStats[0] || null;
  const bestCurrentStreak = Math.max(...habitsWithStats.map((habit) => habit.currentStreak), 0);
  const bestEverStreak = Math.max(...habitsWithStats.map((habit) => habit.bestStreak), 0);

  // WHY: Sync refs AFTER derived values are ready so the notification interval
  // always reads up-to-date numbers on its next tick.
  useEffect(() => { overallProgressRef.current = overallProgressPercent; });
  useEffect(() => { bestStreakRef.current = bestCurrentStreak; });
  // Also hide in-app reminder immediately when all habits are done
  useEffect(() => {
    if (overallProgressPercent >= 100) setShowInAppReminder(false);
  }, [overallProgressPercent]);
  const weeklyAveragePercent = totalHabits
    ? Math.round(
        weeklyActivity.reduce((sum, day) => sum + (day.value / Math.max(totalHabits, 1)) * 100, 0) /
          weeklyActivity.length
      )
    : 0;

  const categories = useMemo(() => {
    const counts = {};
    habitsWithStats.forEach((habit) => {
      counts[habit.category] = (counts[habit.category] || 0) + 1;
    });

    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [habitsWithStats]);

  const coachMood = useMemo(() => {
    if (!totalHabits) {
      return {
        badge: "Ready to plant",
        emoji: "🌱",
        title: "Habit Garden",
        text: "Add your first habit and the dashboard will start tracking your consistency.",
        quote: "Tiny actions become identity when you repeat them.",
      };
    }

    if (overallProgressPercent === 100) {
      return {
        badge: "Perfect day",
        emoji: "🏆",
        title: "Everything is checked off",
        text: "You closed every habit for today. Protect the streak and enjoy the win.",
        quote: "Consistency feels small while you do it and huge when you look back.",
      };
    }

    if (overallProgressPercent >= 60) {
      return {
        badge: "In motion",
        emoji: "🔥",
        title: "Momentum is on your side",
        text: "Most of your daily system is already done. Finish the remaining few while the energy is there.",
        quote: "A strong day usually comes from finishing what you already started.",
      };
    }

    if (overallProgressPercent > 0) {
      return {
        badge: "Started",
        emoji: "✨",
        title: "You are already moving",
        text: "The hardest part is often starting. Turn today into a streak-friendly day.",
        quote: "One check-in is proof that the day is still winnable.",
      };
    }

    return {
      badge: "Fresh start",
      emoji: "🌤️",
      title: "Today is still open",
      text: "Pick one easy habit first. Getting the first win usually unlocks the rest.",
      quote: "Start small enough that you cannot talk yourself out of it.",
    };
  }, [overallProgressPercent, totalHabits]);

  // WHY: Show warning only when the user has meaningful data to lose
  // (habits exist AND at least one has an active streak). Re-show after 14 days
  // even if previously dismissed — users forget their data is local-only.
  const showWarningBanner = useMemo(() => {
    if (!habits.length) return false;
    const anyStreak = habitsWithStats.some((h) => h.currentStreak > 0);
    if (!anyStreak) return false;
    if (!warningDismissedAt) return true;
    const daysSinceDismiss = (Date.now() - new Date(warningDismissedAt).getTime()) / 86400000;
    return daysSinceDismiss >= 14;
  }, [habits.length, habitsWithStats, warningDismissedAt]);

  // Badge display: merge definitions with earned state
  const allBadges = useMemo(() => {
    return BADGE_DEFINITIONS.map((badge) => ({
      ...badge,
      earned: !!earnedBadges[badge.id],
      earnedAt: earnedBadges[badge.id] || null,
    }));
  }, [earnedBadges]);

  // ── Badge unlock detection ──
  // WHY: Separated from the persist effect so it only runs when stats change,
  // not on every state update. Uses earnedBadgesRef to read latest value without
  // creating a circular dependency.
  useEffect(() => {
    const stats = { bestCurrentStreak, totalCheckIns, totalHabits, perfectDaysLast30 };
    const newlyEarned = {};

    BADGE_DEFINITIONS.forEach((badge) => {
      if (!earnedBadgesRef.current[badge.id] && badge.condition(stats)) {
        newlyEarned[badge.id] = new Date().toISOString();
      }
    });

    const newKeys = Object.keys(newlyEarned);
    if (newKeys.length === 0) return;

    setEarnedBadges((prev) => ({ ...prev, ...newlyEarned }));

    // WHY: Animate only the first newly unlocked badge to avoid notification
    // spam when multiple badges unlock simultaneously (e.g. on first app load
    // with imported data).
    const firstNew = BADGE_DEFINITIONS.find((b) => newlyEarned[b.id]);
    if (firstNew) {
      setBadgeJustUnlocked(firstNew.id);
      setBannerMessage(`🏅 Badge unlocked: ${firstNew.emoji} ${firstNew.label}!`);
      const timer = window.setTimeout(() => {
        setBannerMessage((prev) => (prev.includes("Badge unlocked") ? "" : prev));
        setBadgeJustUnlocked(null);
      }, 3000);
      return () => window.clearTimeout(timer);
    }
  }, [bestCurrentStreak, totalCheckIns, totalHabits, perfectDaysLast30]);

  const recentActivity = activityLog.slice(0, 7);

  // WHY: Per-habit 84-day heatmap computed only when a share card is requested,
  // so it has zero cost during normal rendering.
  const shareHabitHeatmap = useMemo(() => {
    if (!shareHabit) return [];
    return getDateRange(84).map((dateKey) => {
      const count = getHabitCountForDate(logs, dateKey, shareHabit.id);
      let intensity = 0;
      if (count > 0) intensity = 1;
      if (count >= shareHabit.goal * 0.33) intensity = 2;
      if (count >= shareHabit.goal * 0.66) intensity = 3;
      if (count >= shareHabit.goal) intensity = 4;
      return { key: dateKey, intensity };
    });
  }, [shareHabit, logs]);

  const shareHabitHeatmapColumns = useMemo(
    () => getWeeklyHeatmapColumns(shareHabitHeatmap),
    [shareHabitHeatmap]
  );

  // ─────────────────────────────────────────────────────────────
  // JSX
  // ─────────────────────────────────────────────────────────────

  return (
    <div className={`app ${darkMode ? "dark" : ""} theme-${colorTheme}`}>
      <div className="background-glow background-glow-1" />
      <div className="background-glow background-glow-2" />
      <div className="background-glow background-glow-3" />
      <div className="paw-bg pattern-bg" />

      <div className="dashboard-shell">

        {/* ── Phase 3 (Fix 10): Sticky section nav ──
             Desktop: sticks below topbar at top of viewport.
             Mobile: fixed bottom tab bar (CSS handles the switch). ── */}
        <nav className="section-nav" aria-label="Section navigation">
          {[
            { id: "today",   emoji: "🏠", label: "Today"   },
            { id: "stats",   emoji: "📊", label: "Stats"   },
            { id: "streaks", emoji: "🔥", label: "Streaks" },
            { id: "badges",  emoji: "🏅", label: "Badges"  },
          ].map(({ id, emoji, label }) => (
            <button
              key={id}
              type="button"
              className={`section-nav-tab ${activeSection === id ? "active" : ""}`}
              onClick={() => scrollToSection(id)}
              aria-current={activeSection === id ? "page" : undefined}
            >
              <span className="nav-tab-emoji">{emoji}</span>
              <span className="nav-tab-label">{label}</span>
            </button>
          ))}
        </nav>

        {/* ── Phase 3 (Fix 9): Offline indicator banner ── */}
        {isOffline && (
          <div className="data-warning-banner offline-banner">
            <span className="data-warning-text">
              📴 You&apos;re offline — your habits are still tracked locally.
            </span>
          </div>
        )}

        {/* ── Data-loss warning banner ── */}
        {showWarningBanner && (
          <div className="data-warning-banner">
            <span className="data-warning-text">
              ⚠️ Your data is saved in this browser only. Clear browsing data = permanent data loss.
            </span>
            <div className="data-warning-actions">
              <button
                type="button"
                className="main-btn secondary compact-btn"
                onClick={exportJSON}
              >
                Export Backup →
              </button>
              <button
                type="button"
                className="data-warning-dismiss"
                onClick={() => setWarningDismissedAt(new Date().toISOString())}
                aria-label="Dismiss warning"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* ── Phase 2: In-app reminder fallback banner (shown after 5 PM when
             notifications are not granted and the reminder is enabled) ── */}
        {showInAppReminder && (
          <div className="data-warning-banner reminder-banner">
            <span className="data-warning-text">
              👋 Don&apos;t forget to check in today!
            </span>
            <div className="data-warning-actions">
              <button
                type="button"
                className="main-btn secondary compact-btn"
                onClick={snoozeInAppReminder}
              >
                Snooze 1h
              </button>
              <button
                type="button"
                className="data-warning-dismiss"
                onClick={dismissInAppReminder}
                aria-label="Dismiss reminder"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="topbar">
          <div>
            <span className="eyebrow">Cozy consistency dashboard</span>
            <h1>Habit Tracker</h1>
            <p className="subtitle">
              A polished habit system with streaks, daily check-ins, weekly rhythm, milestone badges,
              and a 12-week heatmap — built to match the feel of your timer app while tracking habits instead.
            </p>
          </div>

          <div className="topbar-actions">
            {/* ── Phase 3 (Fix 9): Install App button — visible only when the browser
                 fires beforeinstallprompt, disappears once installed. ── */}
            {installPrompt && (
              <button
                type="button"
                className="install-btn"
                onClick={handleInstallClick}
                title="Install Habit Tracker as a standalone app"
              >
                ⬇ Install App
              </button>
            )}

            {/* ── Backup / restore controls ── */}
            <div className="backup-actions glass">
              <span className="theme-picker-label">Backup</span>
              <button
                type="button"
                className="backup-btn"
                onClick={exportJSON}
                title="Download full JSON backup"
              >
                ⬇ JSON
              </button>
              <button
                type="button"
                className="backup-btn"
                onClick={exportCSV}
                title="Download CSV for spreadsheets"
              >
                ⬇ CSV
              </button>
              <button
                type="button"
                className="backup-btn"
                onClick={() => importInputRef.current?.click()}
                title="Import from JSON backup"
              >
                ⬆ Import
              </button>
              {/* WHY: Hidden file input controlled via ref so the visible Import
                   button can trigger it without exposing browser-native file UI */}
              <input
                ref={importInputRef}
                type="file"
                accept=".json"
                style={{ display: "none" }}
                onChange={handleImportFile}
              />
            </div>

            <div className="theme-picker glass">
              <span className="theme-picker-label">Accent</span>
              <div className="theme-picker-swatches">
                {THEME_OPTIONS.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    className={`theme-swatch ${colorTheme === theme.id ? "active" : ""}`}
                    onClick={() => setColorTheme(theme.id)}
                    aria-label={`Switch to ${theme.label.toLowerCase()} theme`}
                    title={theme.label}
                    style={{ background: theme.swatch }}
                  />
                ))}
              </div>
            </div>

            <button type="button" className="theme-toggle" onClick={() => setDarkMode((value) => !value)}>
              <span className="theme-toggle-icon">{darkMode ? "☀️" : "🌙"}</span>
              <span>{darkMode ? "Light" : "Dark"}</span>
            </button>
          </div>
        </div>

        <div id="today" className="hero-grid">
          <section className="glass panel progress-panel interactive-panel">
            <div className="panel-top">
              <div>
                <p className="section-label">Today</p>
                <h2>Daily progress</h2>
              </div>
              <div className="mode-pill">{completedTodayHabits}/{habitsDueToday.length || 0} due today</div>
            </div>

            <div className="progress-hero">
              <div className="progress-ring-shell">
                <svg className="progress-ring" viewBox="0 0 300 300" aria-hidden="true">
                  <circle className="progress-ring-track" cx="150" cy="150" r={ringRadius} />
                  <circle
                    className="progress-ring-progress"
                    cx="150"
                    cy="150"
                    r={ringRadius}
                    style={{
                      strokeDasharray: ringCircumference,
                      strokeDashoffset: ringOffset,
                    }}
                  />
                </svg>

                <div className="progress-core">
                  <span className="progress-kicker">Today&apos;s system</span>
                  <div className="progress-number">{overallProgressPercent}%</div>
                  <div className="progress-caption">
                    {totalChecksToday}/{totalTargetToday || 0} total check-ins completed
                  </div>
                </div>
              </div>

              <div className="progress-copy">
                <div className="message-card interactive-card">
                  <span className="mini-panel-label">Today&apos;s focus</span>
                  <strong>{coachMood.title}</strong>
                  <p>{coachMood.text}</p>
                </div>

                <div className="quick-stats-grid">
                  <div className="quick-stat-card interactive-card">
                    <span>Best current streak</span>
                    <strong>{bestCurrentStreak} days</strong>
                  </div>
                  <div className="quick-stat-card interactive-card">
                    <span>Perfect days</span>
                    <strong>{perfectDaysLast30} / 30</strong>
                  </div>
                  <div className="quick-stat-card interactive-card">
                    <span>Weekly average</span>
                    <strong>{weeklyAveragePercent}%</strong>
                  </div>
                  <div className="quick-stat-card interactive-card">
                    <span>Best ever streak</span>
                    <strong>{bestEverStreak} days</strong>
                  </div>
                </div>
              </div>
            </div>

            {bannerMessage ? <div className="unlock-popup">{bannerMessage}</div> : null}
          </section>

          <section className="glass panel coach-panel interactive-panel">
            <div className="cat-panel-head">
              <span className="cat-badge">
                {coachMood.emoji} {coachMood.badge}
              </span>
              <span className="cat-mini-status">Yesterday: {getYesterdayKey() in logs ? "Tracked" : "No logs"}</span>
            </div>

            <div className="coach-avatar-wrap">
              <div className="coach-avatar">{coachMood.emoji}</div>
            </div>

            <h3>{coachMood.title}</h3>
            <p className="cat-evolution-label">
              {totalHabits || 0} active habits · {categories.length || 0} categories
            </p>

            <div className="cat-ability-card interactive-card">
              <span className="mini-panel-label">Coach note</span>
              <strong>Build wins you can repeat tomorrow</strong>
              <p>{coachMood.quote}</p>
            </div>

            <div className="energy-card interactive-card">
              <div className="energy-head">
                <span>Consistency energy</span>
                <strong>{overallProgressPercent}%</strong>
              </div>
              <div className="progress-track energy-track">
                <div className="progress-fill energy-fill" style={{ width: `${overallProgressPercent}%` }} />
              </div>
            </div>

            <div className="cat-stats-mini">
              <div className="interactive-card">
                <span>Top habit</span>
                <strong>{strongestHabit ? `${strongestHabit.emoji} ${strongestHabit.name}` : "—"}</strong>
              </div>
              <div className="interactive-card">
                <span>Total check-ins</span>
                <strong>{totalCheckIns}</strong>
              </div>
              <div className="interactive-card">
                <span>Habits done today</span>
                <strong>{completedTodayHabits}</strong>
              </div>
              <div className="interactive-card">
                <span>Best streak</span>
                <strong>{bestEverStreak} days</strong>
              </div>
            </div>
          </section>
        </div>

        <div className="stats-grid">
          <div className="glass stat-card stat-card-primary interactive-panel">
            <span className="stat-icon">✅</span>
            <span className="stat-label">Completed today</span>
            <strong className="stat-value">{completedTodayHabits}</strong>
            <span className="stat-sub">Habits fully closed for the day.</span>
          </div>

          <div className="glass stat-card interactive-panel">
            <span className="stat-icon">📈</span>
            <span className="stat-label">Daily check-ins</span>
            <strong className="stat-value">{totalChecksToday}</strong>
            <span className="stat-sub">Progress units logged today.</span>
          </div>

          <div className="glass stat-card interactive-panel">
            <span className="stat-icon">🔥</span>
            <span className="stat-label">Strongest streak</span>
            <strong className="stat-value">{bestCurrentStreak}</strong>
            <span className="stat-sub">Longest active streak right now.</span>
          </div>

          <div className="glass stat-card interactive-panel">
            <span className="stat-icon">🗂️</span>
            <span className="stat-label">Active habits</span>
            <strong className="stat-value">{totalHabits}</strong>
            <span className="stat-sub">Your current tracked routines.</span>
          </div>
        </div>

        <div className="productivity-grid">
          <section className="glass panel habits-panel interactive-panel">
            <div className="panel-top">
              <div>
                <p className="section-label">Habit builder</p>
                <h2>Create and track habits</h2>
              </div>
              <div className="level-chip">{totalHabits} total</div>
            </div>

            <div className="habit-form-card interactive-card">
              <div className="input-grid">
                <input
                  className="habit-input"
                  type="text"
                  value={habitName}
                  onChange={(event) => setHabitName(event.target.value)}
                  placeholder="Habit name"
                />

                <input
                  className="habit-input emoji-input"
                  type="text"
                  value={habitEmoji}
                  maxLength={3}
                  onChange={(event) => setHabitEmoji(event.target.value)}
                  placeholder="✨"
                />

                <select
                  className="habit-input habit-select"
                  value={habitCategory}
                  onChange={(event) => setHabitCategory(event.target.value)}
                >
                  {CATEGORY_OPTIONS.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>

                <input
                  className="habit-input"
                  type="number"
                  min="1"
                  max="10"
                  value={habitGoal}
                  onChange={(event) => setHabitGoal(Number(event.target.value))}
                />
              </div>

              {/* Phase 2 (Fix 8): Unit input row */}
              <div className="input-row-2">
                <input
                  className="habit-input"
                  type="text"
                  maxLength={20}
                  value={habitUnit}
                  onChange={(e) => setHabitUnit(e.target.value)}
                  placeholder="Unit label (optional, e.g. glasses)"
                  list="unit-suggestions-create"
                />
                <datalist id="unit-suggestions-create">
                  <option value="glasses" />
                  <option value="pages" />
                  <option value="minutes" />
                  <option value="reps" />
                  <option value="km" />
                  <option value="miles" />
                  <option value="sets" />
                  <option value="hours" />
                  <option value="sessions" />
                </datalist>
              </div>

              {/* Phase 2 (Fix 6): Schedule picker */}
              <div className="schedule-section">
                <p className="schedule-section-label">Schedule</p>
                <div className="schedule-type-row">
                  {[
                    { value: "daily",          label: "Every day" },
                    { value: "specific_days",  label: "Specific days" },
                    { value: "times_per_week", label: "× per week" },
                  ].map(({ value, label }) => (
                    <label
                      key={value}
                      className={`schedule-radio-label ${habitSchedule.type === value ? "active" : ""}`}
                    >
                      <input
                        type="radio"
                        name="habitScheduleType"
                        value={value}
                        checked={habitSchedule.type === value}
                        onChange={() => setHabitSchedule((prev) => ({ ...prev, type: value }))}
                      />
                      {label}
                    </label>
                  ))}
                </div>

                {habitSchedule.type === "specific_days" && (
                  <div className="day-chips-row">
                    {DAY_NAMES.map((day, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`day-chip ${habitSchedule.days.includes(i) ? "active" : ""}`}
                        onClick={() =>
                          setHabitSchedule((prev) => ({
                            ...prev,
                            days: prev.days.includes(i)
                              ? prev.days.filter((d) => d !== i)
                              : [...prev.days, i].sort((a, b) => a - b),
                          }))
                        }
                      >
                        {day.slice(0, 1)}
                      </button>
                    ))}
                  </div>
                )}

                {habitSchedule.type === "times_per_week" && (
                  <div className="times-per-week-row">
                    <input
                      className="habit-input"
                      type="number"
                      min={1}
                      max={6}
                      value={habitSchedule.timesPerWeek}
                      onChange={(e) =>
                        setHabitSchedule((prev) => ({
                          ...prev,
                          timesPerWeek: Math.max(1, Math.min(6, Number(e.target.value))),
                        }))
                      }
                      style={{ width: "64px" }}
                    />
                    <span className="times-per-week-label">times per week</span>
                  </div>
                )}
              </div>

              <button
                className="main-btn primary add-habit-btn"
                onClick={() =>
                  addHabit({
                    name: habitName,
                    emoji: habitEmoji,
                    goal: habitGoal,
                    category: habitCategory,
                    unit: habitUnit,
                    schedule: habitSchedule,
                  })
                }
              >
                Add habit
              </button>
            </div>

            <div className="template-row">
              {HABIT_TEMPLATES.map((template) => (
                <button
                  key={`${template.name}-${template.goal}`}
                  type="button"
                  className="template-chip"
                  onClick={() => addHabit(template)}
                >
                  <span>{template.emoji}</span>
                  <span>{template.name}</span>
                </button>
              ))}
            </div>

            <div className="habit-list">
              {habitsWithStats.length ? (
                habitsWithStats.map((habit) => (
                  <div
                    key={habit.id}
                    className={`habit-card interactive-card ${habit.doneToday ? "done" : ""}`}
                    onMouseEnter={() => { hoveredHabitIdRef.current = habit.id; }}
                    onMouseLeave={() => { hoveredHabitIdRef.current = null; }}
                  >
                    <div className="habit-main">
                      <div className="habit-title-row">
                        <div className="habit-title-group">
                          <div className="habit-emoji">{habit.emoji}</div>
                          <div>
                            <strong>{habit.name}</strong>
                            <div className="habit-meta">
                              <span>{habit.category}</span>
                              {/* WHY: Show unit alongside goal so users understand what the counter means */}
                              <span>{habit.goal}{habit.unit ? ` ${habit.unit}` : ""} / day</span>
                              <span>{habit.weeklyRate}% weekly rate</span>
                            </div>
                            {/* Phase 2: Show schedule label only when not the default "Every day"
                                 to avoid visual noise for the common case. */}
                            {habit.scheduleLabel !== "Every day" && (
                              <div className="habit-schedule-label">{habit.scheduleLabel}</div>
                            )}
                          </div>
                        </div>

                        <div className="habit-title-actions">
                          {/* WHY: Edit button hidden on desktop until hover (CSS),
                               always visible on touch devices (@media hover:none).
                               Keyboard shortcut: E while hovering. */}
                          <button
                            type="button"
                            className="edit-btn stepper-btn"
                            onClick={() => openEditModal(habit)}
                            title="Edit habit (press E while hovering)"
                            aria-label={`Edit ${habit.name}`}
                          >
                            ✏️
                          </button>
                          {/* Phase 3 (Fix 11): Share habit heatmap card */}
                          <button
                            type="button"
                            className="edit-btn stepper-btn share-trigger-btn"
                            onClick={() => generateShareCard(habit)}
                            title="Download shareable heatmap card"
                            aria-label={`Share ${habit.name} heatmap`}
                            disabled={shareGenerating}
                          >
                            {shareGenerating && shareHabit?.id === habit.id ? "⏳" : "📤"}
                          </button>
                          {/* WHY: times_per_week habits measure weekly progress not daily days */}
                          <div className="habit-streak-pill">
                            {habit.schedule?.type === "times_per_week"
                              ? `🔥 ${habit.currentStreak}/${habit.schedule.timesPerWeek} this week`
                              : `🔥 ${habit.currentStreak} day streak`}
                          </div>
                        </div>
                      </div>

                      <div className="progress-track habit-progress-track">
                        <div className="progress-fill habit-progress-fill" style={{ width: `${habit.progressPercent}%` }} />
                      </div>

                      <div className="habit-counter-row">
                        <div className="stepper-group">
                          <button
                            className="stepper-btn"
                            title={`− 1${habit.unit ? " " + habit.unit : ""}`}
                            onClick={() => setHabitCount(habit, habit.todayCount - 1)}
                          >
                            −
                          </button>
                          <div className="count-pill">
                            {/* WHY: Unit label in the counter resolves the ambiguous "6 / 8" UX
                                 so users understand what they're counting (glasses, reps, pages…) */}
                            {habit.todayCount} / {habit.goal}{habit.unit ? ` ${habit.unit}` : ""}
                          </div>
                          <button
                            className="stepper-btn"
                            title={`+ 1${habit.unit ? " " + habit.unit : ""}`}
                            onClick={() => setHabitCount(habit, habit.todayCount + 1)}
                          >
                            +
                          </button>
                        </div>

                        <div className="habit-actions">
                          <button className="main-btn secondary compact-btn" onClick={() => toggleHabitDone(habit)}>
                            {habit.doneToday ? "Undo" : "Complete"}
                          </button>
                          {/* WHY: Delete shows a confirmation step — destructive actions
                               must never execute on a single click (global constraint). */}
                          <button
                            className="main-btn ghost compact-btn"
                            onClick={() => setDeletingHabitId(habit.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state-card">No habits yet. Add one above to start your tracker.</div>
              )}
            </div>
          </section>

          <section id="streaks" className="glass panel leaderboard-panel interactive-panel">
            <div className="panel-top">
              <div>
                <p className="section-label">Consistency board</p>
                <h2>Best performers</h2>
              </div>
              <div className="level-chip">Top streaks</div>
            </div>

            <div className="leaderboard-list">
              {habitsWithStats.length ? (
                [...habitsWithStats]
                  .sort((a, b) => b.currentStreak - a.currentStreak || b.totalChecks - a.totalChecks)
                  .slice(0, 5)
                  .map((habit, index) => (
                    <div key={habit.id} className="leaderboard-row interactive-card">
                      <div className="leaderboard-rank">#{index + 1}</div>
                      <div className="leaderboard-copy">
                        <strong>
                          {habit.emoji} {habit.name}
                        </strong>
                        <small>
                          {habit.currentStreak} current · {habit.bestStreak} best · {habit.totalChecks} total check-ins
                        </small>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="empty-state-card">Your streak leaderboard will appear after your first check-in.</div>
              )}
            </div>

            <div className="summary-list leaderboard-summary">
              <div className="summary-row interactive-card">
                <span>Perfect days in last 30</span>
                <strong>{perfectDaysLast30}</strong>
              </div>
              <div className="summary-row interactive-card">
                <span>Weekly completion average</span>
                <strong>{weeklyAveragePercent}%</strong>
              </div>
              <div className="summary-row interactive-card">
                <span>Total categories</span>
                <strong>{categories.length}</strong>
              </div>
            </div>
          </section>
        </div>

        <section id="stats" className="glass panel analytics-panel interactive-panel">
          <div className="panel-top">
            <div>
              <p className="section-label">Trends</p>
              <h2>Habit analytics</h2>
            </div>
            <div className="level-chip">Last 12 weeks</div>
          </div>

          <div className="analytics-stats-grid">
            <div className="analytics-stat-card interactive-card">
              <span>Total check-ins</span>
              <strong>{totalCheckIns}</strong>
            </div>
            <div className="analytics-stat-card interactive-card">
              <span>Current best streak</span>
              <strong>{bestCurrentStreak} days</strong>
            </div>
            <div className="analytics-stat-card interactive-card">
              <span>Perfect days</span>
              <strong>{perfectDaysLast30}</strong>
            </div>
            <div className="analytics-stat-card interactive-card">
              <span>Average day</span>
              <strong>{weeklyAveragePercent}%</strong>
            </div>
          </div>

          <div className="analytics-chart-card interactive-card">
            <div className="weekly-progress-head">
              <span>Completion heatmap</span>
              <strong>Last 84 days</strong>
            </div>

            <div className="heatmap-layout">
              <div>
                <div className="heatmap-wrap">
                  <div className="heatmap-weekdays">
                    <span>Mon</span>
                    <span>Wed</span>
                    <span>Fri</span>
                  </div>

                  <div className="heatmap-grid">
                    {heatmapColumns.map((column, columnIndex) => (
                      <div key={columnIndex} className="heatmap-column">
                        {column.map((day) => (
                          <div
                            key={day.key}
                            className={[
                              "heatmap-cell",
                              day.isToday ? "today" : "",
                              day.isNonScheduled ? "non-scheduled" : "",
                            ].filter(Boolean).join(" ")}
                            style={getHeatmapCellStyle(heatmapPalette, day.intensity)}
                            title={
                              day.isNonScheduled
                                ? `${day.label} · No habits scheduled`
                                : `${day.label} · ${day.value} check-ins`
                            }
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="heatmap-footer-row">
                  <div className="heatmap-legend">
                    <span>Less</span>
                    <div className="legend-scale">
                      {[0, 1, 2, 3, 4].map((level) => (
                        <span key={level} className="heatmap-cell" style={getHeatmapCellStyle(heatmapPalette, level)} />
                      ))}
                    </div>
                    <span>More</span>
                  </div>

                  <div className="palette-row">
                    <span className="palette-label">Square colors</span>
                    {Object.keys(HEATMAP_PALETTES).map((palette) => (
                      <button
                        key={palette}
                        className={`palette-chip ${heatmapPalette === palette ? "active" : ""}`}
                        onClick={() => setHeatmapPalette(palette)}
                        aria-label={`${palette} heatmap palette`}
                        type="button"
                      >
                        {HEATMAP_PALETTES[palette].slice(1).map((color, index) => (
                          <span key={`${palette}-${index}`} className="palette-dot" style={{ background: color }} />
                        ))}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="analytics-bottom-grid">
            <div className="history-list-card interactive-card">
              <div className="weekly-progress-head">
                <span>Weekly rhythm</span>
                <strong>{weeklyAveragePercent}% average</strong>
              </div>

              <div className="weekly-bars">
                {weeklyActivity.map((day) => (
                  <div key={day.key} className={`week-bar-wrap ${day.isToday ? "today" : ""}`}>
                    <div className="week-bar" style={{ height: `${Math.max(14, (day.value / weeklyPeak) * 100)}%` }} />
                    <strong className="week-bar-value">{day.display}</strong>
                    <span>{day.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="history-list-card interactive-card">
              <div className="weekly-progress-head">
                <span>Recent activity</span>
                <strong>{recentActivity.length} entries</strong>
              </div>

              <div className="history-list">
                {recentActivity.length ? (
                  recentActivity.map((entry) => (
                    <div key={entry.id} className="history-row">
                      <div>
                        <strong>
                          {entry.emoji} {entry.habitName}
                        </strong>
                        <small>
                          {entry.type === "complete" ? "Completed for the day" : `Checked in (${entry.amount})`}
                        </small>
                      </div>
                      <span>{formatDateTime(entry.createdAt)}</span>
                    </div>
                  ))
                ) : (
                  <div className="empty-state-card">Your recent activity will show up as you log habits.</div>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="bottom-grid">
          <section id="badges" className="glass panel xp-panel interactive-panel">
            <div className="panel-top">
              <div>
                <p className="section-label">Milestones</p>
                <h2>Consistency badges</h2>
              </div>
              <div className="level-chip">
                {allBadges.filter((b) => b.earned).length}/{allBadges.length} earned
              </div>
            </div>

            {/* ── 20 badges grouped by category ── */}
            {BADGE_CATEGORY_LABELS.map(({ key, label }) => {
              const categoryBadges = allBadges.filter((b) => b.category === key);
              return (
                <div key={key} className="badge-category-section">
                  <p className="section-label badge-category-label">{label}</p>
                  <div className="badge-grid">
                    {categoryBadges.map((badge) => (
                      <div
                        key={badge.id}
                        className={[
                          "badge-chip",
                          badge.earned ? "earned" : "locked",
                          badgeJustUnlocked === badge.id ? "badge-just-unlocked" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <span className="badge-emoji">{badge.emoji}</span>
                        <div className="badge-info">
                          <strong>{badge.earned ? badge.label : "???"}</strong>
                          <small>
                            {badge.earned
                              ? `Earned ${formatShortDate(badge.earnedAt)}`
                              : badge.hint}
                          </small>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="category-wrap">
              <div className="weekly-progress-head">
                <span>Habit categories</span>
                <strong>{categories.length} groups</strong>
              </div>

              <div className="category-grid">
                {categories.length ? (
                  categories.map(([category, count]) => (
                    <div key={category} className="mini-panel interactive-card">
                      <span className="mini-panel-label">{category}</span>
                      <strong>{count} habit{count > 1 ? "s" : ""}</strong>
                    </div>
                  ))
                ) : (
                  <div className="empty-state-card">Add habits to see your category breakdown.</div>
                )}
              </div>
            </div>
          </section>

          <section className="glass panel summary-panel interactive-panel">
            <p className="section-label">Overview</p>
            <h2>Snapshot</h2>

            <div className="summary-list">
              <div className="summary-row interactive-card">
                <span>Habits tracked</span>
                <strong>{totalHabits}</strong>
              </div>
              <div className="summary-row interactive-card">
                <span>Completed today</span>
                <strong>{completedTodayHabits}</strong>
              </div>
              <div className="summary-row interactive-card">
                <span>Theme</span>
                <strong>{darkMode ? "Dark" : "Light"}</strong>
              </div>
              <div className="summary-row interactive-card">
                <span>Accent</span>
                <strong>{THEME_OPTIONS.find((theme) => theme.id === colorTheme)?.label || "Green"}</strong>
              </div>
              <div className="summary-row interactive-card">
                <span>Heatmap palette</span>
                <strong>{heatmapPalette}</strong>
              </div>
              <div className="summary-row interactive-card">
                <span>Latest activity</span>
                <strong>{recentActivity[0] ? recentActivity[0].habitName : "No activity yet"}</strong>
              </div>
            </div>

            <div className="focus-state-card interactive-card">
              <span className="focus-state-label">Today&apos;s note</span>
              <strong>{coachMood.badge}</strong>
              <p>{coachMood.text}</p>
            </div>

            {/* Phase 2: Reminder settings */}
            <div className="reminder-section">
              <button
                type="button"
                className="reminder-toggle-btn"
                onClick={() => setShowReminderSettings((v) => !v)}
              >
                🔔 Daily Reminder {showReminderSettings ? "▲" : "▼"}
              </button>

              {showReminderSettings && (
                <div className="reminder-settings-panel">
                  <label className="reminder-checkbox-label">
                    <input
                      type="checkbox"
                      checked={reminderPrefs.enabled}
                      onChange={(e) =>
                        setReminderPrefs((prev) => ({ ...prev, enabled: e.target.checked }))
                      }
                    />
                    Enable daily reminder
                  </label>

                  {reminderPrefs.enabled && (
                    <>
                      <div className="reminder-time-row">
                        <span className="reminder-time-label">Remind me at</span>
                        <input
                          type="time"
                          className="habit-input reminder-time-input"
                          value={reminderPrefs.time}
                          onChange={(e) =>
                            setReminderPrefs((prev) => ({ ...prev, time: e.target.value }))
                          }
                        />
                      </div>

                      {notifPermission === "default" && (
                        <button
                          type="button"
                          className="main-btn secondary compact-btn"
                          onClick={requestNotificationPermission}
                        >
                          Allow notifications
                        </button>
                      )}
                      {notifPermission === "granted" && (
                        <p className="helper-text">✅ Browser notifications enabled for {reminderPrefs.time}.</p>
                      )}
                      {notifPermission === "denied" && (
                        <p className="helper-text">🔕 Notifications blocked — in-app banner will appear after 5 PM.</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          MODALS — rendered outside the scrollable shell so
          they always overlay the full viewport correctly.
          Each one has an overlay click-to-dismiss and an
          Escape key handler (registered in the combined
          keyboard effect above).
          ════════════════════════════════════════════════════ */}

      {/* ── Edit habit modal ── */}
      {editingHabit && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-card glass" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit habit</h3>
              <button type="button" className="modal-close" onClick={closeEditModal} aria-label="Close">
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="edit-form-grid">
                <label className="edit-label">
                  <span>Name</span>
                  <input
                    className="habit-input"
                    type="text"
                    maxLength={50}
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    autoFocus
                  />
                </label>

                <label className="edit-label">
                  <span>Emoji</span>
                  <input
                    className="habit-input emoji-input"
                    type="text"
                    maxLength={3}
                    value={editForm.emoji}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, emoji: e.target.value }))}
                  />
                </label>

                <label className="edit-label">
                  <span>Daily goal</span>
                  <input
                    className="habit-input"
                    type="number"
                    min={1}
                    max={99}
                    value={editForm.goal}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, goal: Number(e.target.value) }))}
                  />
                </label>

                <label className="edit-label">
                  <span>Unit label <em className="edit-optional">(optional)</em></span>
                  {/* WHY: datalist gives preset suggestions without locking the user
                       into a fixed list — they can still type any custom unit. */}
                  <input
                    className="habit-input"
                    type="text"
                    maxLength={20}
                    value={editForm.unit}
                    placeholder="e.g. glasses, reps, pages"
                    list="unit-suggestions"
                    onChange={(e) => setEditForm((prev) => ({ ...prev, unit: e.target.value }))}
                  />
                  <datalist id="unit-suggestions">
                    <option value="glasses" />
                    <option value="pages" />
                    <option value="minutes" />
                    <option value="reps" />
                    <option value="km" />
                    <option value="miles" />
                    <option value="sets" />
                    <option value="hours" />
                    <option value="sessions" />
                  </datalist>
                </label>
              </div>

              {/* Phase 2: Schedule editing */}
              <label className="edit-label">
                <span>Schedule</span>
                <div className="schedule-type-row">
                  {[
                    { value: "daily",          label: "Every day" },
                    { value: "specific_days",  label: "Specific days" },
                    { value: "times_per_week", label: "× per week" },
                  ].map(({ value, label }) => (
                    <label
                      key={value}
                      className={`schedule-radio-label ${(editForm.schedule?.type || "daily") === value ? "active" : ""}`}
                    >
                      <input
                        type="radio"
                        name="editScheduleType"
                        value={value}
                        checked={(editForm.schedule?.type || "daily") === value}
                        onChange={() =>
                          setEditForm((prev) => ({
                            ...prev,
                            schedule: { ...(prev.schedule || DEFAULT_SCHEDULE), type: value },
                          }))
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>

                {editForm.schedule?.type === "specific_days" && (
                  <div className="day-chips-row">
                    {DAY_NAMES.map((day, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`day-chip ${(editForm.schedule?.days || []).includes(i) ? "active" : ""}`}
                        onClick={() =>
                          setEditForm((prev) => {
                            const days = prev.schedule?.days || [];
                            return {
                              ...prev,
                              schedule: {
                                ...prev.schedule,
                                days: days.includes(i)
                                  ? days.filter((d) => d !== i)
                                  : [...days, i].sort((a, b) => a - b),
                              },
                            };
                          })
                        }
                      >
                        {day.slice(0, 1)}
                      </button>
                    ))}
                  </div>
                )}

                {editForm.schedule?.type === "times_per_week" && (
                  <div className="times-per-week-row">
                    <input
                      className="habit-input"
                      type="number"
                      min={1}
                      max={6}
                      value={editForm.schedule?.timesPerWeek || 3}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          schedule: {
                            ...prev.schedule,
                            timesPerWeek: Math.max(1, Math.min(6, Number(e.target.value))),
                          },
                        }))
                      }
                      style={{ width: "64px" }}
                    />
                    <span className="times-per-week-label">times per week</span>
                  </div>
                )}
              </label>

              <p className="helper-text modal-note">
                ✓ Edits do not affect your existing completions, streaks, or history.
              </p>
            </div>

            <div className="modal-footer">
              <button type="button" className="main-btn ghost" onClick={closeEditModal}>
                Cancel
              </button>
              <button type="button" className="main-btn primary" onClick={saveEditHabit}>
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Import confirmation modal ── */}
      {importModalState.open && (
        <div className="modal-overlay" onClick={closeImportModal}>
          <div className="modal-card glass" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Import habits</h3>
              <button type="button" className="modal-close" onClick={closeImportModal} aria-label="Close">
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p>
                This will add <strong>{importModalState.newCount}</strong> habit
                {importModalState.newCount !== 1 ? "s" : ""} to your current library.
              </p>
              <p className="helper-text">
                Existing habits with matching names will be skipped. Import is always additive — it never
                overwrites existing data.
              </p>
            </div>

            <div className="modal-footer">
              <button type="button" className="main-btn ghost" onClick={closeImportModal}>
                Cancel
              </button>
              <button type="button" className="main-btn primary" onClick={confirmImport}>
                Import & Merge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Phase 3 (Fix 11): Off-screen share card — captured by html2canvas.
           Position: fixed; left: -9999px keeps it out of the layout while still
           being measurable by html2canvas. Only rendered when shareHabit is set. ── */}
      <div
        ref={shareCardRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          width: "800px",
          height: "400px",
          borderRadius: "20px",
          overflow: "hidden",
          background: (THEME_SHARE_COLORS[colorTheme] || THEME_SHARE_COLORS.green).bg,
          padding: "32px",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: (THEME_SHARE_COLORS[colorTheme] || THEME_SHARE_COLORS.green).text,
        }}
      >
        {shareHabit && (() => {
          const sc = THEME_SHARE_COLORS[colorTheme] || THEME_SHARE_COLORS.green;
          const palette = HEATMAP_PALETTES[heatmapPalette] || HEATMAP_PALETTES.mint;
          return (
            <>
              {/* Header row */}
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <span style={{ fontSize: "42px", lineHeight: 1 }}>{shareHabit.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "-0.01em" }}>
                    {shareHabit.name}
                  </div>
                  <div style={{ fontSize: "12px", opacity: 0.55, marginTop: "2px" }}>
                    {shareHabit.scheduleLabel || "Every day"} · last 12 weeks
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "11px", opacity: 0.4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Habit Tracker
                  </div>
                </div>
              </div>

              {/* Heatmap — inline styles because html2canvas skips external CSS */}
              <div style={{ display: "flex", gap: "4px", flex: 1, alignItems: "center" }}>
                {shareHabitHeatmapColumns.map((col, ci) => (
                  <div key={ci} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {col.map((day) => (
                      <div
                        key={day.key}
                        style={{
                          width: "26px",
                          height: "26px",
                          borderRadius: "4px",
                          background: palette[day.intensity] || palette[0],
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>

              {/* Stats footer */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "24px", alignItems: "flex-end" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "28px", fontWeight: 800, color: sc.accent }}>
                    {shareHabit.schedule?.type === "times_per_week"
                      ? `${shareHabit.currentStreak}/${shareHabit.schedule.timesPerWeek}`
                      : shareHabit.currentStreak}
                  </div>
                  <div style={{ fontSize: "11px", opacity: 0.55 }}>
                    {shareHabit.schedule?.type === "times_per_week" ? "this week" : "day streak 🔥"}
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "28px", fontWeight: 800, color: sc.accent }}>
                    {shareHabit.totalChecks}
                  </div>
                  <div style={{ fontSize: "11px", opacity: 0.55 }}>total ✅</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "28px", fontWeight: 800, color: sc.accent }}>
                    {shareHabit.weeklyRate}%
                  </div>
                  <div style={{ fontSize: "11px", opacity: 0.55 }}>weekly rate</div>
                </div>
              </div>
            </>
          );
        })()}
      </div>

      {/* ── Delete confirmation modal ── */}
      {deletingHabitId && (
        <div className="modal-overlay" onClick={() => setDeletingHabitId(null)}>
          <div className="modal-card glass" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete habit?</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setDeletingHabitId(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p>
                Permanently remove{" "}
                <strong>{habits.find((h) => h.id === deletingHabitId)?.name}</strong> and all its history?
              </p>
              <p className="helper-text">This cannot be undone. Export a backup first if you want to keep the data.</p>
            </div>

            <div className="modal-footer">
              <button type="button" className="main-btn ghost" onClick={() => setDeletingHabitId(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="main-btn danger-btn"
                onClick={() => {
                  removeHabit(deletingHabitId);
                  setDeletingHabitId(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
