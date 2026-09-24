"use client";

import { useCallback, useEffect, useState } from "react";
import { CONTRACT_ADDRESS, getReadClient } from "@/lib/genlayer";

export type SolvencyState = {
  asset_count: number;
  attestation_count: number;
};

export type AssetSummary = {
  asset_id: string;
  name: string;
  threshold_bps: number;
};

export type Asset = {
  name: string;
  source_urls_json: string;
  threshold_bps: number;
  standard: string;
  registrant: string;
  registered_at: string;
};

export type Attestation = {
  asset_id: string;
  reserves_bps: number | null;
  liabilities_bps: number | null;
  coverage_bps: number;
  verdict: "SOLVENT" | "UNDERCOLLATERALISED" | "INCONCLUSIVE";
  tolerance_bps: number;
  source_hashes_json: string;
  submitted_by: string;
  attested_at: string;
};

export function isConfigured(): boolean {
  return CONTRACT_ADDRESS.length > 0;
}

// Standalone (not just the hook's internal refresh) so bindAttestation.ts's
// count-delta check can read a fresh attestation_count without going
// through React state.
export async function fetchSolvencyState(): Promise<SolvencyState> {
  const client = getReadClient();
  return (await client.readContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    functionName: "get_state",
    args: [],
  })) as SolvencyState;
}

// Studio Next's public RPC caps at 30 requests/minute (confirmed live) -
// shared across every visitor's polling, not per-user, so an aggressive
// interval scales badly with even a couple of concurrent visitors.
export function useSolvencyState(pollMs = 20000) {
  const [state, setState] = useState<SolvencyState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isConfigured()) {
      setError("NEXT_PUBLIC_CONTRACT_ADDRESS is not set.");
      setLoading(false);
      return;
    }
    try {
      setState(await fetchSolvencyState());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read contract state.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [refresh, pollMs]);

  return { state, error, loading, refresh };
}

export async function fetchAssets(): Promise<AssetSummary[]> {
  const client = getReadClient();
  return (await client.readContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    functionName: "list_assets",
    args: [],
  })) as AssetSummary[];
}

export async function fetchAsset(assetId: string): Promise<Asset> {
  const client = getReadClient();
  return (await client.readContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    functionName: "get_asset",
    args: [assetId],
  })) as Asset;
}

// Global, newest-first - the contract has no per-asset index, so callers
// that need a single asset's history filter this client-side.
export async function fetchAttestations(offset: number, limit: number): Promise<Attestation[]> {
  const client = getReadClient();
  return (await client.readContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    functionName: "get_attestations",
    args: [offset, limit],
  })) as Attestation[];
}
