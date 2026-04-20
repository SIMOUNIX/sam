export function relTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const diff = (Date.now() - then) / 1000;
  const abs = Math.abs(diff);
  const sign = diff >= 0 ? "" : "in ";
  const suffix = diff >= 0 ? " ago" : "";
  if (abs < 60) return `${sign}${Math.round(abs)}s${suffix}`;
  if (abs < 3600) return `${sign}${Math.round(abs / 60)}m${suffix}`;
  if (abs < 86400) return `${sign}${Math.round(abs / 3600)}h${suffix}`;
  return `${sign}${Math.round(abs / 86400)}d${suffix}`;
}

export function absTime(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(iso);
  }
}
