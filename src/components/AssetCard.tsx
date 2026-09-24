"use client";

import { useEffect, useState } from "react";
import { fetchAsset, type Asset, type Attestation } from "@/lib/useSolvencyState";
import { formatCoverage, formatTolerance, timeAgo, truncateAddress, type Verdict } from "@/lib/format";
import { Card, VerdictBadge } from "@/components/ui";
import AttestButton from "@/components/AttestButton";

export default function AssetCard({
  assetId,
  attestations,
  onSettled,
}: {
  assetId: string;
  attestations: Attestation[]; // already filtered to this asset, newest-first
  onSettled: () => void;
}) {
  const [asset, setAsset] = useState<Asset | null>(null);

  useEffect(() => {
    let cancelled = false;
    let attempt = 0;
    // Asset metadata is immutable once registered, so a failed fetch (e.g.
    // Studio Next's "Server busy" or its 500-requests/hour rate limit, both
    // confirmed live) just needs a retry, not a permanent fallback to the
    // bare asset_id. Backs off (5s, 10s, 20s... capped at 60s) rather than
    // a fixed interval, since a real hourly cap only gets worse if every
    // failed card retries on the same tight loop at once.
    function load() {
      fetchAsset(assetId)
        .then((a) => {
          if (!cancelled) setAsset(a);
        })
        .catch(() => {
          if (cancelled) return;
          const delay = Math.min(5000 * 2 ** attempt, 60000);
          attempt += 1;
          setTimeout(load, delay);
        });
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [assetId]);

  const latest = attestations[0];
  const latestVerdict: Verdict = latest?.verdict ?? "NONE";
  const sourceUrls = asset ? (JSON.parse(asset.source_urls_json) as string[]) : [];
  const sourceCount = sourceUrls.length;

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{asset?.name ?? assetId}</span>
            <span className="mono text-xs text-[color:var(--muted)]">{assetId}</span>
          </div>
          {asset && (
            <>
              <p className="mt-1 text-xs text-[color:var(--muted)]">
                Requires ≥{formatCoverage(asset.threshold_bps)} coverage · {sourceCount} independent source
                {sourceCount === 1 ? "" : "s"} cross-checked
                {asset.standard && ` · ${asset.standard}`}
              </p>
              <p className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs">
                {sourceUrls.map((url, i) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[color:var(--accent)] hover:underline"
                  >
                    Source{sourceUrls.length > 1 ? ` ${i + 1}` : ""} ↗
                  </a>
                ))}
              </p>
            </>
          )}
        </div>
        <VerdictBadge verdict={latestVerdict} />
      </div>

      {latest && (
        <div className="mb-3 rounded-lg border border-[color:var(--surface-border)] p-3 text-sm">
          <div className="flex items-baseline justify-between">
            <span className="text-[color:var(--muted)]">Latest coverage</span>
            <span className="mono text-base font-medium">{formatCoverage(latest.coverage_bps)}</span>
          </div>
          <p className="mt-1 text-xs text-[color:var(--muted)]">
            verified within {formatTolerance(latest.tolerance_bps)} · {timeAgo(latest.attested_at)} · by{" "}
            {truncateAddress(latest.submitted_by)}
          </p>
        </div>
      )}

      <AttestButton assetId={assetId} onSettled={onSettled} />

      {attestations.length > 1 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-[color:var(--muted)] hover:text-[color:var(--foreground)]">
            {attestations.length - 1} earlier attestation{attestations.length - 1 === 1 ? "" : "s"}
          </summary>
          <div className="mt-2 space-y-2">
            {attestations.slice(1).map((a, i) => (
              <div key={`${a.attested_at}-${i}`} className="flex items-center justify-between rounded-lg border border-[color:var(--surface-border)] p-2 text-xs">
                <span>{formatCoverage(a.coverage_bps)}</span>
                <VerdictBadge verdict={a.verdict} />
                <span className="text-[color:var(--muted)]">{timeAgo(a.attested_at)}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </Card>
  );
}
