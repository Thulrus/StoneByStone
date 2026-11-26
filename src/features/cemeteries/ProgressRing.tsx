/** A small donut showing a 0–1 share. The label is the accessible name. */
export function ProgressRing({ value, label }: { value: number; label: string }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const v = Math.min(1, Math.max(0, value));
  return (
    <svg viewBox="0 0 48 48" className="size-12 shrink-0 -rotate-90" role="img" aria-label={label}>
      <circle cx="24" cy="24" r={r} fill="none" strokeWidth="6" className="stroke-surface-2" />
      <circle
        cx="24"
        cy="24"
        r={r}
        fill="none"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${v * c} ${c}`}
        className="stroke-primary"
        opacity={v === 0 ? 0 : 1}
      />
    </svg>
  );
}
