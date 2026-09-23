import { describe, expect, it } from "vitest";
import { bindAttestationFromDelta, findBoundAttestation } from "@/lib/bindAttestation";
import type { Attestation } from "@/lib/useSolvencyState";

const ME = "0xAAAA000000000000000000000000000000AAAA";
const SOMEONE_ELSE = "0xBBBB000000000000000000000000000000BBBB";

function makeAttestation(overrides: Partial<Attestation> = {}): Attestation {
  return {
    asset_id: "XUSD",
    reserves_bps: 1250000000000,
    liabilities_bps: 1000000000000,
    coverage_bps: 12500,
    verdict: "SOLVENT",
    tolerance_bps: 500,
    source_hashes_json: "[]",
    submitted_by: ME,
    attested_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("findBoundAttestation", () => {
  it("matches on asset_id, submitted_by, and tolerance", () => {
    const mine = makeAttestation();
    const found = findBoundAttestation([mine], "XUSD", ME, 500);
    expect(found).toBe(mine);
  });

  it("matches submitted_by case-insensitively", () => {
    const mine = makeAttestation({ submitted_by: ME.toLowerCase() });
    const found = findBoundAttestation([mine], "XUSD", ME, 500);
    expect(found).toBe(mine);
  });

  it("does not match a record for a different asset", () => {
    const other = makeAttestation({ asset_id: "YUSD" });
    const found = findBoundAttestation([other], "XUSD", ME, 500);
    expect(found).toBeNull();
  });

  it("does not match a record submitted by someone else", () => {
    const theirs = makeAttestation({ submitted_by: SOMEONE_ELSE });
    const found = findBoundAttestation([theirs], "XUSD", ME, 500);
    expect(found).toBeNull();
  });
});

describe("bindAttestationFromDelta", () => {
  it("binds to the correct record when a concurrent attestation from someone else landed on top", () => {
    const theirs = makeAttestation({ asset_id: "YUSD", submitted_by: SOMEONE_ELSE });
    const mine = makeAttestation();
    const result = bindAttestationFromDelta(10, 12, [theirs, mine], "XUSD", ME, 500);
    expect(result).toEqual({ kind: "bound", attestation: mine });
  });

  it("reports no_new_record when attestation_count never increased (a real, live scenario for this contract - see solvency-oracle/CONTRACT.md)", () => {
    const result = bindAttestationFromDelta(10, 10, [makeAttestation()], "XUSD", ME, 500);
    expect(result).toEqual({ kind: "no_new_record" });
  });

  it("reports no_new_record when the count went backwards", () => {
    const result = bindAttestationFromDelta(10, 9, [], "XUSD", ME, 500);
    expect(result).toEqual({ kind: "no_new_record" });
  });

  it("only searches within the delta window, not the whole history", () => {
    const newer2 = makeAttestation({ asset_id: "YUSD" });
    const newer1 = makeAttestation({ asset_id: "YUSD" });
    const stale = makeAttestation(); // matches, but outside the delta
    const result = bindAttestationFromDelta(10, 12, [newer2, newer1, stale], "XUSD", ME, 500);
    expect(result).toEqual({ kind: "unmatched" });
  });

  it("reports unmatched when the count increased but nothing in the delta window matches", () => {
    const theirs = makeAttestation({ submitted_by: SOMEONE_ELSE });
    const result = bindAttestationFromDelta(10, 11, [theirs], "XUSD", ME, 500);
    expect(result).toEqual({ kind: "unmatched" });
  });
});
