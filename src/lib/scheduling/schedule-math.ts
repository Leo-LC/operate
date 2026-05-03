export function computeShiftHours(startTime: string, endTime: string, breakMinutes: number): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  const minutes = Math.max(0, end - start - breakMinutes);
  return Number((minutes / 60).toFixed(2));
}
