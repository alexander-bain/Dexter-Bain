export function isLocked(lockAt: string, now = new Date()) {
  return now.getTime() >= new Date(lockAt).getTime();
}

export function formatLockTime(lockAt: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/New_York",
  }).format(new Date(lockAt));
}
