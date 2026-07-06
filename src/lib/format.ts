export function formatSAR(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  return new Intl.NumberFormat("ar-SA-u-nu-latn", { style: "currency", currency: "SAR", maximumFractionDigits: 2 }).format(v);
}

export function formatDate(d: string | Date | null | undefined, withTime = false): string {
  if (!d) return "—";
  const dd = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dd.getTime())) return "—";
  return dd.toLocaleDateString("ar-SA-u-nu-latn", {
    year: "numeric", month: "short", day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}


export function fromNow(d: string | Date | null | undefined): string {
  if (!d) return "";
  const dd = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - dd.getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "الآن";
  if (min < 60) return `منذ ${min} د`;
  const h = Math.round(min / 60);
  if (h < 24) return `منذ ${h} س`;
  const days = Math.round(h / 24);
  if (days < 30) return `منذ ${days} يوم`;
  return formatDate(dd);
}
