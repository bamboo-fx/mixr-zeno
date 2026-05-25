// "Social window" = the time when mixers happen on campus.
// Thursday 20:00 (8 PM) through Sunday 03:00 (3 AM). All times local.
//
// Used by:
//   - Campus Heat Map (only active during the window)
//   - Location sharing (only allowed during the window)
//
// Sunday in JS = 0, Monday = 1, ... Thursday = 4, Friday = 5, Saturday = 6.

export function isInSocialWindow(now: Date = new Date()): boolean {
  const day = now.getDay();
  const hour = now.getHours();

  // Thursday 20:00 → end of day
  if (day === 4 && hour >= 20) return true;
  // All of Friday + Saturday
  if (day === 5 || day === 6) return true;
  // Sunday until 03:00
  if (day === 0 && hour < 3) return true;
  return false;
}

// Returns the next time the window opens (used for UI countdowns / labels).
export function nextSocialWindowStart(now: Date = new Date()): Date {
  const d = new Date(now);
  // Move forward day-by-day until we land on Thursday before 20:00.
  while (true) {
    if (d.getDay() === 4 && d.getHours() < 20) {
      d.setHours(20, 0, 0, 0);
      return d;
    }
    if (isInSocialWindow(d)) return d;
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
  }
}

export function socialWindowLabel(): string {
  return 'Thursday 8 PM — Sunday 3 AM';
}
