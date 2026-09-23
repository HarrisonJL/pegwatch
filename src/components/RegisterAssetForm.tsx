"use client";

import { useRef, useState } from "react";
import { CONTRACT_ADDRESS, getWriteClient } from "@/lib/genlayer";
import { useWallet } from "@/lib/useWallet";
import { pollTransaction, STATUS_COPY, describeFailure, type Progress } from "@/lib/pollTransaction";
import { Button, Field, inputClass } from "@/components/ui";

const MAX_URLS = 3;
const ACCEPTED = "5";

function parseUrls(raw: string): string[] {
  const out: string[] = [];
  for (const u of raw.split(",")) {
    const trimmed = u.trim();
    if (trimmed && !out.includes(trimmed)) out.push(trimmed);
  }
  return out;
}

export default function RegisterAssetForm({ onSettled }: { onSettled: () => void }) {
  const { account, connecting, error: walletError, connect } = useWallet();
  const [assetId, setAssetId] = useState("");
  const [name, setName] = useState("");
  const [urlsText, setUrlsText] = useState("");
  const [thresholdText, setThresholdText] = useState("1.0");
  const [standard, setStandard] = useState("");
  const [stage, setStage] = useState<"idle" | "submitting" | "waiting" | "done">("idle");
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cancelledRef = useRef(false);
  const busy = stage === "submitting" || stage === "waiting";

  async function submit() {
    if (!account) return;
    const id = assetId.trim().toUpperCase();
    const urls = parseUrls(urlsText);
    const threshold = Number(thresholdText);

    if (!id) {
      setError("Give the asset a short identifier, e.g. USDX.");
      return;
    }
    if (!name.trim()) {
      setError("Give the asset a display name.");
      return;
    }
    if (urls.length === 0 || urls.length > MAX_URLS) {
      setError(`Provide 1-${MAX_URLS} https:// source URLs.`);
      return;
    }
    if (urls.some((u) => !u.startsWith("https://"))) {
      setError("Source URLs must start with https://");
      return;
    }
    if (!Number.isFinite(threshold) || threshold < 0) {
      setError("Threshold must be a non-negative number, e.g. 1.0 for fully backed.");
      return;
    }

    setStage("submitting");
    setError(null);
    cancelledRef.current = false;
    try {
      const client = getWriteClient(account);
      const txHash = await client.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: "register_asset",
        args: [id, name.trim(), urls, Math.round(threshold * 10000), standard.trim()],
        value: 0n,
      });
      setStage("waiting");
      const tx = await pollTransaction(client, txHash, "ACCEPTED", setProgress, () => cancelledRef.current);
      const statusNum = String(tx.status);
      if (statusNum !== ACCEPTED) {
        setError(describeFailure(tx, "is this asset ID already registered, or a URL not https://?"));
        setStage("idle");
        return;
      }
      setAssetId("");
      setName("");
      setUrlsText("");
      setThresholdText("1.0");
      setStandard("");
      setStage("done");
      onSettled();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register asset.");
      setStage("idle");
    } finally {
      setProgress(null);
    }
  }

  if (!account) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm text-[color:var(--muted)]">Connect a wallet to register an asset (any wallet can call this).</p>
        <Button onClick={connect} loading={connecting}>
          Connect wallet
        </Button>
        {walletError && <p className="text-sm text-red-400">{walletError}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Asset ID (short, e.g. USDX)">
          <input className={inputClass} value={assetId} onChange={(e) => setAssetId(e.target.value)} placeholder="USDX" disabled={busy} />
        </Field>
        <Field label="Display name">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Example Stablecoin" disabled={busy} />
        </Field>
      </div>

      <Field label={`Source URLs (comma-separated, 1-${MAX_URLS}, https:// only)`}>
        <input
          className={inputClass}
          value={urlsText}
          onChange={(e) => setUrlsText(e.target.value)}
          placeholder="https://example.com/reserve-attestation"
          disabled={busy}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Required coverage ratio (e.g. 1.0 = fully backed)">
          <input
            className={inputClass}
            value={thresholdText}
            onChange={(e) => setThresholdText(e.target.value)}
            inputMode="decimal"
            disabled={busy}
          />
        </Field>
        <Field label="Backing standard (optional, descriptive)">
          <input className={inputClass} value={standard} onChange={(e) => setStandard(e.target.value)} placeholder="1:1 USD reserve" disabled={busy} />
        </Field>
      </div>

      <Button onClick={submit} loading={busy} disabled={busy}>
        Register asset
      </Button>

      {progress && stage === "waiting" && (
        <p className="text-xs text-[color:var(--muted)]">{STATUS_COPY[progress.statusName] ?? progress.statusName}</p>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {stage === "done" && <p className="text-sm text-[color:var(--accent)]">Asset registered.</p>}
    </div>
  );
}
