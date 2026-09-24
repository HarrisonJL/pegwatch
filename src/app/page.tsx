"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CONTRACT_ADDRESS, chain } from "@/lib/genlayer";
import {
  useSolvencyState,
  fetchAssets,
  fetchAttestations,
  isConfigured,
  type AssetSummary,
  type Attestation,
} from "@/lib/useSolvencyState";
import { truncateAddress } from "@/lib/format";
import { Card, StatCard } from "@/components/ui";
import RegisterAssetForm from "@/components/RegisterAssetForm";
import AssetCard from "@/components/AssetCard";

export default function Home() {
  const { state, error, loading, refresh } = useSolvencyState();
  const [assets, setAssets] = useState<AssetSummary[]>([]);
  const [attestations, setAttestations] = useState<Attestation[]>([]);
  // Distinct from the top-level `error` (get_state failing): this is
  // list_assets/get_attestations failing, e.g. Studio Next's "Server busy:
  // all 8 execution slots occupied" under load. Confirmed live: without
  // this, a single transient failure here left the page showing "No assets
  // registered yet" underneath a correct, non-zero asset count from
  // get_state - genuinely wrong, not just an ugly error - and it wouldn't
  // recover until asset_count/attestation_count next changed, since that's
  // the only thing that re-triggers this fetch. Now it keeps the last good
  // data on screen and retries itself rather than going blank.
  const [dataError, setDataError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  // Exponential backoff (5s, 10s, 20s... capped at 60s), not a fixed
  // interval - confirmed live that Studio Next's rate limit is a real
  // hourly cap (500/hour), not just a burst limit, so hammering it every
  // 5s on failure only makes recovery slower for everyone sharing it.
  const retryAttempt = useRef(0);

  const refreshData = useCallback(async () => {
    if (!isConfigured()) return;
    try {
      const [a, att] = await Promise.all([fetchAssets(), fetchAttestations(0, 50)]);
      setAssets(a);
      setAttestations(att);
      setDataError(null);
      setHasLoadedOnce(true);
      retryAttempt.current = 0;
    } catch (err) {
      setDataError(err instanceof Error ? err.message : "Failed to load assets.");
      const delay = Math.min(5000 * 2 ** retryAttempt.current, 60000);
      retryAttempt.current += 1;
      setTimeout(refreshData, delay);
    }
  }, []);

  // Loads once on mount - no interval. Same reasoning as useSolvencyState:
  // a background timer here was pure unnecessary load on a shared,
  // rate-limited endpoint. refreshAll (below) covers "I just did
  // something, check for real" instead.
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const refreshAll = useCallback(() => {
    refresh();
    refreshData();
  }, [refresh, refreshData]);

  if (!isConfigured()) {
    return (
      <Card>
        <p className="text-sm text-red-400">NEXT_PUBLIC_CONTRACT_ADDRESS is not set.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Monitored assets</h1>
          <p className="text-sm text-[color:var(--muted)]">
            Register any stablecoin or tokenized asset with its public reserve pages, and any wallet can trigger a
            real validator committee to independently fetch those pages, extract reserves and liabilities, and
            reach consensus on whether it&apos;s solvent - not one party&apos;s claim.
          </p>
        </div>
        <button
          onClick={refreshAll}
          className="shrink-0 rounded-lg border border-[color:var(--surface-border)] px-3 py-1.5 text-xs text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Contract" value={truncateAddress(CONTRACT_ADDRESS)} hint={`chain ${chain.id}`} />
        <StatCard
          label="Assets registered"
          value={loading ? "…" : state ? String(state.asset_count) : error ? "—" : "0"}
        />
        <StatCard
          label="Attestations made"
          value={loading ? "…" : state ? String(state.attestation_count) : error ? "—" : "0"}
        />
      </div>

      {error && (
        <Card>
          <p className="text-sm text-red-400">{error}</p>
        </Card>
      )}

      {dataError && (
        <Card>
          <p className="text-sm text-red-400">
            Couldn&apos;t refresh the asset list ({dataError}) - retrying automatically. Showing the last data
            loaded successfully{assets.length === 0 ? " (none yet)" : ""}.
          </p>
        </Card>
      )}

      <Card title="Register an asset">
        <RegisterAssetForm onSettled={refreshAll} />
      </Card>

      <div className="space-y-4">
        {assets.length === 0 ? (
          <Card>
            <p className="text-sm text-[color:var(--muted)]">
              {!hasLoadedOnce ? "Loading assets..." : "No assets registered yet."}
            </p>
          </Card>
        ) : (
          assets.map((a) => (
            <AssetCard
              key={a.asset_id}
              assetId={a.asset_id}
              attestations={attestations.filter((att) => att.asset_id === a.asset_id)}
              onSettled={refreshAll}
            />
          ))
        )}
      </div>
    </div>
  );
}
