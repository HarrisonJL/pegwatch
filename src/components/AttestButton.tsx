"use client";

import { useRef, useState } from "react";
import { CONTRACT_ADDRESS, getWriteClient, estimateAndAttachFees } from "@/lib/genlayer";
import { useWallet } from "@/lib/useWallet";
import { pollTransaction, STATUS_COPY, describeFailure, type Progress } from "@/lib/pollTransaction";
import { fetchSolvencyState, type Attestation } from "@/lib/useSolvencyState";
import { resolveBoundAttestation } from "@/lib/bindAttestation";
import { Button } from "@/components/ui";

const ACCEPTED = "5";
const DEFAULT_TOLERANCE_BPS = 500; // 5% - reasonable default for a coverage-ratio check

export default function AttestButton({ assetId, onSettled }: { assetId: string; onSettled: () => void }) {
  const { account, connecting, error: walletError, connect } = useWallet();
  const [stage, setStage] = useState<"idle" | "submitting" | "waiting" | "done">("idle");
  const [progress, setProgress] = useState<Progress | null>(null);
  const [result, setResult] = useState<Attestation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsRetry, setNeedsRetry] = useState(false);
  const cancelledRef = useRef(false);

  async function submit() {
    if (!account) return;
    setStage("submitting");
    setError(null);
    setNeedsRetry(false);
    setResult(null);
    cancelledRef.current = false;
    try {
      const beforeCount = (await fetchSolvencyState()).attestation_count;
      const client = getWriteClient(account);
      const fees = await estimateAndAttachFees(client);
      const txHash = await client.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: "attest",
        args: [assetId, DEFAULT_TOLERANCE_BPS],
        value: 0n,
        fees,
      });
      setStage("waiting");
      const tx = await pollTransaction(client, txHash, "ACCEPTED", setProgress, () => cancelledRef.current);
      const statusNum = String(tx.status);
      if (statusNum !== ACCEPTED) {
        // Confirmed live, not theoretical (see solvency-oracle/CONTRACT.md):
        // this contract's validators each have to fetch a live page AND
        // run an LLM extraction in the same round, which fails to reach
        // clean consensus more often than a pure-LLM call - surfacing
        // this as a normal, expected "try again" rather than a scary error
        // is the honest thing to do, not a cover-up of a flaky feature.
        // describeFailure separately distinguishes a genuine contract-level
        // rejection (confirmed live: a deterministic assert failure
        // resolves to a decided status with txExecutionResultName
        // "FINISHED_WITH_ERROR", not the generic consensus-trouble path).
        setError(describeFailure(tx, "this asset may no longer exist."));
        setNeedsRetry(true);
        setStage("idle");
        return;
      }

      const bindResult = await resolveBoundAttestation(beforeCount, assetId, account, DEFAULT_TOLERANCE_BPS);
      if (bindResult.kind !== "bound") {
        setError(
          bindResult.kind === "unmatched"
            ? "The attestation was accepted, but the recorded result doesn't match what was submitted. Check the history below."
            : "The attestation reached ACCEPTED, but its bookkeeping never landed on-chain - this is the same live-observed failure mode described in the contract's own docs. Try again."
        );
        setNeedsRetry(true);
        setStage("idle");
        return;
      }
      setResult(bindResult.attestation);
      setStage("done");
      onSettled();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit attestation.");
      setNeedsRetry(true);
      setStage("idle");
    } finally {
      setProgress(null);
    }
  }

  const busy = stage === "submitting" || stage === "waiting";

  if (!account) {
    return (
      <div className="flex items-center gap-2">
        <Button onClick={connect} loading={connecting} variant="secondary">
          Connect wallet to attest
        </Button>
        {walletError && <p className="text-xs text-red-400">{walletError}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button onClick={submit} loading={busy} disabled={busy} variant="secondary">
        {needsRetry ? "Try again" : "Attest now"}
      </Button>
      {progress && stage === "waiting" && (
        <p className="text-xs text-[color:var(--muted)]">{STATUS_COPY[progress.statusName] ?? progress.statusName}</p>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
      {result && stage === "done" && (
        <p className="text-xs text-[color:var(--accent)]">
          New attestation recorded: {result.verdict.toLowerCase()}.
        </p>
      )}
    </div>
  );
}
