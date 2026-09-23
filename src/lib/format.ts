export function truncateAddress(address: string, chars = 4): string {
  if (!address || address.length < 2 + chars * 2) return address;
  return `${address.slice(0, 2 + chars)}…${address.slice(-chars)}`;
}

export function timeAgo(isoString: string): string {
  const then = new Date(isoString).getTime();
  if (Number.isNaN(then)) return isoString;
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Renders a bps-scaled value (raw * 10000) back to a plain decimal, e.g. 12500 -> "1.25". The contract stores raw, unrounded figures. */
export function formatValue(value: number | null): string {
  if (value === null) return "?";
  const whole = Math.trunc(value / 10000);
  const frac = Math.abs(value % 10000);
  if (frac === 0) return String(whole);
  const fracStr = String(frac).padStart(4, "0").replace(/0+$/, "");
  return `${whole}.${fracStr}`;
}

/** coverage_bps / threshold_bps are both scaled the same way as any other bps figure - reuse formatValue, then read as a multiple (e.g. "1.25x"). */
export function formatCoverage(bps: number): string {
  return `${formatValue(bps)}x`;
}

export function formatTolerance(bps: number): string {
  if (bps === 0) return "exact match";
  const pct = bps / 100;
  const pctStr = Number.isInteger(pct) ? String(pct) : pct.toFixed(2);
  return `±${pctStr}%`;
}

export type Verdict = "SOLVENT" | "UNDERCOLLATERALISED" | "INCONCLUSIVE" | "NONE";

export function verdictLabel(verdict: Verdict): string {
  switch (verdict) {
    case "SOLVENT":
      return "Solvent";
    case "UNDERCOLLATERALISED":
      return "Undercollateralised";
    case "INCONCLUSIVE":
      return "Inconclusive";
    default:
      return "No attestations yet";
  }
}

export function verdictClass(verdict: Verdict): string {
  switch (verdict) {
    case "SOLVENT":
      return "status-solvent";
    case "UNDERCOLLATERALISED":
      return "status-undercollateralised";
    case "INCONCLUSIVE":
      return "status-inconclusive";
    default:
      return "status-none";
  }
}
