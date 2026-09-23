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
    fetchAsset(assetId).then(setAsset).catch(() => setAsset(null));
  }, [assetId]);

  const latest = attestations[0];
  const latestVerdict: Verdict = latest?.verdict ?? "NONE";

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{asset?.name ?? assetId}</span>
            <span className="mono text-xs text-[color:var(--muted)]">{assetId}</span>
          </div>
          {asset && (
            <p className="mt-1 text-xs text-[color:var(--muted)]">
              Requires ≥{formatCoverage(asset.threshold_bps)} coverage
              {asset.standard && ` · ${asset.standard}`}
            </p>
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
