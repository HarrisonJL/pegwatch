"use client";

import { useCallback, useEffect, useState } from "react";
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

  const refreshData = useCallback(async () => {
    if (!isConfigured()) return;
    const [a, att] = await Promise.all([fetchAssets(), fetchAttestations(0, 50)]);
    setAssets(a);
    setAttestations(att);
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData, state?.asset_count, state?.attestation_count]);

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
      <div>
        <h1 className="mb-1 text-xl font-semibold">Monitored assets</h1>
        <p className="text-sm text-[color:var(--muted)]">
          Register any stablecoin or tokenized asset with its public reserve pages, and any wallet can trigger a
          real validator committee to independently fetch those pages, extract reserves and liabilities, and
          reach consensus on whether it&apos;s solvent - not one party&apos;s claim.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Contract" value={truncateAddress(CONTRACT_ADDRESS)} hint={`chain ${chain.id}`} />
        <StatCard label="Assets registered" value={loading ? "…" : String(state?.asset_count ?? 0)} />
        <StatCard label="Attestations made" value={loading ? "…" : String(state?.attestation_count ?? 0)} />
      </div>

      {error && (
        <Card>
          <p className="text-sm text-red-400">{error}</p>
        </Card>
      )}

      <Card title="Register an asset">
        <RegisterAssetForm onSettled={refreshAll} />
      </Card>

      <div className="space-y-4">
        {assets.length === 0 ? (
          <Card>
            <p className="text-sm text-[color:var(--muted)]">No assets registered yet.</p>
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
