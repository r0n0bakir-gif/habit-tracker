import { useEffect, useMemo, useState } from "react";
import "./App.css";

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

const pad = (value) => String(value).padStart(2, "0");

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

const getDateRange = (days) =>
  Array.from({ length: days }, (_, index) => {
    const date = addDays(new Date(), -(days - 1 - index));
    return toDateKey(date);
  });

const getHabitCountForDate = (logs, dateKey, habitId) => logs?.[dateKey]?.[habitId] || 0;

const isHabitCompleteForDate = (habit, logs, dateKey) =>
  getHabitCountForDate(logs, dateKey, habit.id) >= habit.goal;

const getHabitCurrentStreak = (habit, logs) => {
  let streak = 0;
  let cursor = new Date();

  while (isHabitCompleteForDate(habit, logs, toDateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
};

const getHabitBestStreak = (habit, logs) => {
  const completeDates = Object.keys(logs || {})
    .filter((dateKey) => isHabitCompleteForDate(habit, logs, dateKey))
    .sort((a, b) => dateFromKey(a) - dateFromKey(b));

  if (!completeDates.length) return 0;

  let best = 1;
  let current = 1;

  for (let index = 1; index < completeDates.length; index += 1) {
    const previous = dateFromKey(completeDates[index - 1]);
    const currentDate = dateFromKey(completeDates[index]);
    const difference = Math.round((currentDate - previous) / 86400000);

    if (difference === 1) {
      current += 1;
      best = Math.max(best, current);
    } else if (difference > 1) {
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

const getInitialData = () => {
  const defaults = {
    habits: [
      { id: createId(), name: "Drink water", emoji: "💧", category: "Health", goal: 4 },
      { id: createId(), name: "Read", emoji: "📚", category: "Study", goal: 1 },
      { id: createId(), name: "Stretch", emoji: "🧘", category: "Health", goal: 1 },
      { id: createId(), name: "Journal", emoji: "✍️", category: "Mind", goal: 1 },
    ],
    logs: {},
    activityLog: [],
    darkMode: true,
    colorTheme: "green",
    heatmapPalette: "mint",
  };

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaults;
    return { ...defaults, ...JSON.parse(saved) };
  } catch {
    return defaults;
  }
};

export default function App() {
  const initial = getInitialData();
  const today = toDateKey();

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

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        habits,
        logs,
        activityLog,
        darkMode,
        colorTheme,
        heatmapPalette,
      })
    );
  }, [habits, logs, activityLog, darkMode, colorTheme, heatmapPalette]);

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
    };

    setHabits((prev) => [newHabit, ...prev]);
    setHabitName("");
    setHabitEmoji("✨");
    setHabitGoal(1);
    setHabitCategory("Life");
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

        return {
          ...habit,
          todayCount,
          doneToday: todayCount >= habit.goal,
          progressPercent: Math.min(100, (todayCount / habit.goal) * 100),
          currentStreak,
          bestStreak,
          totalChecks,
          weeklyRate: Math.round((recentCompletions / 7) * 100),
        };
      })
      .sort((a, b) => Number(a.doneToday) - Number(b.doneToday) || b.currentStreak - a.currentStreak);
  }, [habits, logs, today]);

  const totalHabits = habitsWithStats.length;
  const completedTodayHabits = habitsWithStats.filter((habit) => habit.doneToday).length;
  const totalChecksToday = habitsWithStats.reduce(
    (sum, habit) => sum + Math.min(habit.todayCount, habit.goal),
    0
  );
  const totalTargetToday = habitsWithStats.reduce((sum, habit) => sum + habit.goal, 0);
  const overallProgressPercent = totalTargetToday
    ? Math.round((totalChecksToday / totalTargetToday) * 100)
    : 0;

  const ringRadius = 122;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (overallProgressPercent / 100) * ringCircumference;

  const weeklyActivity = useMemo(() => {
    return getDateRange(7).map((dateKey) => {
      const completed = habitsWithStats.filter((habit) =>
        isHabitCompleteForDate(habit, logs, dateKey)
      ).length;

      return {
        key: dateKey,
        label: formatWeekday(dateKey),
        value: completed,
        display: `${completed}/${Math.max(totalHabits, 1)}`,
        isToday: dateKey === today,
      };
    });
  }, [habitsWithStats, logs, today, totalHabits]);

  const weeklyPeak = Math.max(...weeklyActivity.map((day) => day.value), 1);

  const heatmapDays = useMemo(() => {
    const targetPerDay = Math.max(totalTargetToday, 1);

    return getDateRange(84).map((dateKey) => {
      const value = habitsWithStats.reduce(
        (sum, habit) => sum + Math.min(getHabitCountForDate(logs, dateKey, habit.id), habit.goal),
        0
      );

      let intensity = 0;
      if (value > 0) intensity = 1;
      if (value >= targetPerDay * 0.33) intensity = 2;
      if (value >= targetPerDay * 0.66) intensity = 3;
      if (value >= targetPerDay) intensity = 4;

      return {
        key: dateKey,
        label: formatDisplayDate(dateKey),
        value,
        intensity,
        isToday: dateKey === today,
      };
    });
  }, [habitsWithStats, logs, today, totalTargetToday]);

  const heatmapColumns = useMemo(() => getWeeklyHeatmapColumns(heatmapDays), [heatmapDays]);

  const perfectDaysLast30 = useMemo(() => {
    if (!totalHabits) return 0;

    return getDateRange(30).filter((dateKey) =>
      habitsWithStats.every((habit) => isHabitCompleteForDate(habit, logs, dateKey))
    ).length;
  }, [habitsWithStats, logs, totalHabits]);

  const totalCheckIns = useMemo(
    () => habitsWithStats.reduce((sum, habit) => sum + habit.totalChecks, 0),
    [habitsWithStats]
  );

  const strongestHabit = habitsWithStats[0] || null;
  const bestCurrentStreak = Math.max(...habitsWithStats.map((habit) => habit.currentStreak), 0);
  const bestEverStreak = Math.max(...habitsWithStats.map((habit) => habit.bestStreak), 0);
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

  const milestones = [
    {
      id: "first-check",
      label: "First check-in",
      description: "Log your first habit completion.",
      done: totalCheckIns >= 1,
    },
    {
      id: "25-checks",
      label: "25 total check-ins",
      description: "Build real repetition across your habits.",
      done: totalCheckIns >= 25,
    },
    {
      id: "perfect-week",
      label: "7 perfect days",
      description: "Finish every habit on seven separate days.",
      done: perfectDaysLast30 >= 7,
    },
    {
      id: "7-streak",
      label: "7-day streak",
      description: "Keep one habit alive for a full week.",
      done: bestEverStreak >= 7,
    },
  ];

  const recentActivity = activityLog.slice(0, 7);

  return (
    <div className={`app ${darkMode ? "dark" : ""} theme-${colorTheme}`}>
      <div className="background-glow background-glow-1" />
      <div className="background-glow background-glow-2" />
      <div className="background-glow background-glow-3" />
      <div className="paw-bg pattern-bg" />

      <div className="dashboard-shell">
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

        <div className="hero-grid">
          <section className="glass panel progress-panel interactive-panel">
            <div className="panel-top">
              <div>
                <p className="section-label">Today</p>
                <h2>Daily progress</h2>
              </div>
              <div className="mode-pill">{completedTodayHabits}/{totalHabits || 0} habits done</div>
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

              <button
                className="main-btn primary add-habit-btn"
                onClick={() =>
                  addHabit({
                    name: habitName,
                    emoji: habitEmoji,
                    goal: habitGoal,
                    category: habitCategory,
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
                  <div key={habit.id} className={`habit-card interactive-card ${habit.doneToday ? "done" : ""}`}>
                    <div className="habit-main">
                      <div className="habit-title-row">
                        <div className="habit-title-group">
                          <div className="habit-emoji">{habit.emoji}</div>
                          <div>
                            <strong>{habit.name}</strong>
                            <div className="habit-meta">
                              <span>{habit.category}</span>
                              <span>{habit.goal} / day</span>
                              <span>{habit.weeklyRate}% weekly rate</span>
                            </div>
                          </div>
                        </div>

                        <div className="habit-streak-pill">🔥 {habit.currentStreak} day streak</div>
                      </div>

                      <div className="progress-track habit-progress-track">
                        <div className="progress-fill habit-progress-fill" style={{ width: `${habit.progressPercent}%` }} />
                      </div>

                      <div className="habit-counter-row">
                        <div className="stepper-group">
                          <button className="stepper-btn" onClick={() => setHabitCount(habit, habit.todayCount - 1)}>
                            −
                          </button>
                          <div className="count-pill">
                            {habit.todayCount} / {habit.goal}
                          </div>
                          <button className="stepper-btn" onClick={() => setHabitCount(habit, habit.todayCount + 1)}>
                            +
                          </button>
                        </div>

                        <div className="habit-actions">
                          <button className="main-btn secondary compact-btn" onClick={() => toggleHabitDone(habit)}>
                            {habit.doneToday ? "Undo" : "Complete"}
                          </button>
                          <button className="main-btn ghost compact-btn" onClick={() => removeHabit(habit.id)}>
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

          <section className="glass panel leaderboard-panel interactive-panel">
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

        <section className="glass panel analytics-panel interactive-panel">
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
                            className={`heatmap-cell ${day.isToday ? "today" : ""}`}
                            style={getHeatmapCellStyle(heatmapPalette, day.intensity)}
                            title={`${day.label} · ${day.value} check-ins`}
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
          <section className="glass panel xp-panel interactive-panel">
            <div className="panel-top">
              <div>
                <p className="section-label">Milestones</p>
                <h2>Consistency badges</h2>
              </div>
              <div className="level-chip">{milestones.filter((item) => item.done).length}/{milestones.length} earned</div>
            </div>

            <div className="achievement-strip achievement-grid milestone-grid">
              {milestones.map((milestone) => (
                <div key={milestone.id} className={`achievement-chip ${milestone.done ? "done" : ""}`}>
                  <span>{milestone.done ? "✓" : "•"}</span>
                  <div>
                    <strong>{milestone.label}</strong>
                    <small>{milestone.description}</small>
                  </div>
                </div>
              ))}
            </div>

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
          </section>
        </div>
      </div>
    </div>
  );
}
