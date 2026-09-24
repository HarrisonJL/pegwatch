import { Card } from "@/components/ui";

export default function About() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 text-xl font-semibold">How PegWatch works</h1>
        <p className="text-sm text-[color:var(--muted)]">
          A frontend for <span className="mono">SolvencyOracle</span>, a reusable proof-of-reserves attestation
          primitive on GenLayer - not a product with its own trust model, just a window onto real consensus.
        </p>
      </div>

      <Card title="No single party's claim">
        <p className="text-sm leading-relaxed text-[color:var(--foreground)]">
          Proof-of-reserves today mostly means trusting an exchange&apos;s own attestation page, or a single
          auditor&apos;s report. Nobody independently re-derives the number. Registering an asset here just means
          pointing at its public reserve pages - clicking &quot;Attest now&quot; triggers a real GenLayer
          validator committee, each of whom independently fetches those pages themselves and extracts the
          figures. The verdict - <span className="mono">SOLVENT</span> or{" "}
          <span className="mono">UNDERCOLLATERALISED</span> - only lands if they agree.
        </p>
      </Card>

      <Card title="Reusing a hard-won design, not re-deriving it">
        <p className="text-sm leading-relaxed text-[color:var(--foreground)]">
          Agreement is a precise, uniform relative-tolerance check on the raw extracted numbers - the same design
          the sibling{" "}
          <a href="https://github.com/HarrisonJL/ballpark" target="_blank" rel="noreferrer" className="text-[color:var(--accent)] hover:underline">
            Ballpark
          </a>{" "}
          project only got right after two real steward rejections (the first for allowing too loose a tolerance
          to mean anything, the second for a rounding &quot;fix&quot; that silently didn&apos;t enforce what it
          claimed to). SolvencyOracle inherits the corrected version directly rather than repeating that mistake.
        </p>
      </Card>

      <Card title="A real limitation, shown honestly, not hidden">
        <p className="text-sm leading-relaxed text-[color:var(--foreground)]">
          Every validator here has to fetch a live web page <em>and</em> run an LLM extraction within the same
          consensus round - meaningfully heavier, in real-world latency, than a pure-LLM call. On GenLayer
          Studio Next (this deployment) every demo attestation so far has reached clean consensus on the first
          try, in well under a minute. That wasn&apos;t true everywhere: an earlier deployment of this same
          contract on GenLayer Bradbury genuinely needed a retry on one attestation, and separately hit a
          transaction that stayed unresolved for hours - both documented, not hidden, in{" "}
          <a
            href="https://github.com/HarrisonJL/solvency-oracle/blob/main/CONTRACT.md"
            target="_blank"
            rel="noreferrer"
            className="text-[color:var(--accent)] hover:underline"
          >
            CONTRACT.md
          </a>
          , which is part of why this deployment moved networks. If you click &quot;Attest now&quot; and still
          see a message about consensus not being reached, that&apos;s this kind of thing, not a broken app -
          click &quot;Try again.&quot;
        </p>
      </Card>

      <Card title="What's stored, and what isn't enforced">
        <p className="text-sm leading-relaxed text-[color:var(--foreground)]">
          The stored figure is the raw extraction, never rounded - the tolerance that verified it is stored
          alongside it as an explicit, checkable bound. An asset&apos;s &quot;backing standard&quot; is
          descriptive text, not something the contract verifies independently; what it does check is whether the
          reserve and liability <em>numbers</em> a page reports meet the registered threshold. Registration is
          permissionless and immutable - anyone can add an asset, and its source URLs never change afterward.
        </p>
      </Card>
    </div>
  );
}
