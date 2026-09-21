export interface AnniversaryMilestone {
  id: string; // e.g. "1_month", "6_months", "1_year"
  title: string;
  badge: string;
  description: string;
  emoji: string;
  months: number;
  targetDate: Date;
  diffDays: number; // 0 = today, 1..3 = within celebration grace period, negative = future
  isCurrent: boolean;
}

export interface WorkJourneyStats {
  workedDays: number;
  startDate: Date;
  startDateFormatted: string;
  formattedDuration: string;
  currentAnniversary: AnniversaryMilestone | null;
  nextMilestone: AnniversaryMilestone | null;
}

const MILESTONES: { months: number; id: string; badge: string; title: string; emoji: string; description: string }[] = [
  { months: 1, id: '1_month', badge: '1 Month', title: '1 Month Milestone', emoji: '🌱', description: 'Congratulations on completing your first month of freelancing!' },
  { months: 3, id: '3_months', badge: '3 Months', title: '3 Months Milestone', emoji: '🎯', description: 'Quarter milestone reached! Your freelancing foundation is getting stronger every day.' },
  { months: 6, id: '6_months', badge: '6 Months', title: '6 Months Milestone', emoji: '⚡', description: 'Half a year of freelancing! Half-year anniversary of building your independent career.' },
  { months: 9, id: '9_months', badge: '9 Months', title: '9 Months Milestone', emoji: '🚀', description: 'Three quarters in! Consistent hustle and exceptional client work.' },
  { months: 12, id: '1_year', badge: '1 Year', title: '1 Year Anniversary', emoji: '🏆', description: 'Happy 1 Year Freelancing Anniversary! A full year of independence, growth, and excellence.' },
  { months: 18, id: '1_5_years', badge: '1.5 Years', title: '1.5 Years Anniversary', emoji: '✨', description: '18 months of freelancing excellence! Halfway to year two.' },
  { months: 24, id: '2_years', badge: '2 Years', title: '2 Years Anniversary', emoji: '👑', description: 'Happy 2 Years Anniversary! Two incredible years mastering your craft as an independent pro.' },
  { months: 30, id: '2_5_years', badge: '2.5 Years', title: '2.5 Years Anniversary', emoji: '🌟', description: 'Two and a half years of freelancing triumph! Keep reaching new heights.' },
  { months: 36, id: '3_years', badge: '3 Years', title: '3 Years Anniversary', emoji: '💎', description: 'Happy 3 Years Anniversary! A three-year freelancing legacy built on trust and skill.' },
];

// Dynamically extend for years 4 to 30
for (let y = 4; y <= 30; y++) {
  MILESTONES.push({
    months: y * 12,
    id: `${y}_years`,
    badge: `${y} Years`,
    title: `${y} Years Anniversary`,
    emoji: y % 5 === 0 ? '🎖️' : '🔥',
    description: `Happy ${y} Years Freelancing Anniversary! An extraordinary testament to your mastery and dedication.`
  });
  MILESTONES.push({
    months: y * 12 + 6,
    id: `${y}_5_years`,
    badge: `${y}.5 Years`,
    title: `${y}.5 Years Anniversary`,
    emoji: '💫',
    description: `${y} and a half years of independent freelancing excellence!`
  });
}

// Sort milestones by months
MILESTONES.sort((a, b) => a.months - b.months);

/**
 * Calculates human duration string like "1 yr, 4 mos, 12 days" or "45 days"
 */
export function formatDurationBreakdown(days: number): string {
  if (days <= 0) return 'Just started';
  if (days === 1) return '1 day';
  if (days < 30) return `${days} days`;

  const years = Math.floor(days / 365.25);
  const remainingDays = days % 365.25;
  const months = Math.floor(remainingDays / 30.4375);
  const leftDays = Math.floor(remainingDays % 30.4375);

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? 'yr' : 'yrs'}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? 'mo' : 'mos'}`);
  if (years === 0 && leftDays > 0) parts.push(`${leftDays} ${leftDays === 1 ? 'day' : 'days'}`);

  return parts.length > 0 ? parts.join(', ') : `${days} days`;
}

/**
 * Calculates work journey stats, worked days, and anniversary milestones.
 */
export function calculateWorkJourney(startDateStr?: string | null, customNow?: Date): WorkJourneyStats | null {
  if (!startDateStr || typeof startDateStr !== 'string') return null;

  // Normalize YYYY-MM-DD
  const parts = startDateStr.split('-');
  let start: Date;
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    start = new Date(year, month, day);
  } else {
    start = new Date(startDateStr);
  }

  if (isNaN(start.getTime())) return null;

  const now = customNow || new Date();
  const startMidnight = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffMs = nowMidnight.getTime() - startMidnight.getTime();
  if (diffMs < 0) {
    // Future date entered
    return {
      workedDays: 0,
      startDate: start,
      startDateFormatted: start.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
      formattedDuration: 'Start date in future',
      currentAnniversary: null,
      nextMilestone: null
    };
  }

  const workedDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const sYear = start.getFullYear();
  const sMonth = start.getMonth();
  const sDay = start.getDate();

  let currentAnniversary: AnniversaryMilestone | null = null;
  let nextMilestone: AnniversaryMilestone | null = null;

  for (const m of MILESTONES) {
    const targetYear = sYear + Math.floor((sMonth + m.months) / 12);
    const targetMonth = (sMonth + m.months) % 12;
    // Cap at the last day of target month (e.g. Feb 28/29 or Apr 30)
    const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const targetDay = Math.min(sDay, daysInTargetMonth);
    const targetDate = new Date(targetYear, targetMonth, targetDay);

    // Difference in days between today and target milestone date
    const diffToTargetDays = Math.round((nowMidnight.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));

    // Anniversary celebration window: today (0) or within the last 3 days
    if (diffToTargetDays >= 0 && diffToTargetDays <= 3) {
      currentAnniversary = {
        ...m,
        targetDate,
        diffDays: diffToTargetDays,
        isCurrent: true
      };
    }

    // Future milestone: target date is ahead
    if (diffToTargetDays < 0 && !nextMilestone) {
      nextMilestone = {
        ...m,
        targetDate,
        diffDays: diffToTargetDays,
        isCurrent: false
      };
    }
  }

  return {
    workedDays,
    startDate: start,
    startDateFormatted: start.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
    formattedDuration: formatDurationBreakdown(workedDays),
    currentAnniversary,
    nextMilestone
  };
}

/**
 * Storage helpers for anniversary dismissal per user.
 */
export function isAnniversaryDismissed(userId: string, milestoneId: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    return localStorage.getItem(`crestflow_anniv_dismissed_${userId}_${milestoneId}`) === 'true';
  } catch {
    return false;
  }
}

export function dismissAnniversary(userId: string, milestoneId: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(`crestflow_anniv_dismissed_${userId}_${milestoneId}`, 'true');
  } catch (err) {
    console.error(err);
  }
}
