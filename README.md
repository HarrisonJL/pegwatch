# PegWatch

A frontend for [SolvencyOracle](https://github.com/HarrisonJL/solvency-oracle), a reusable proof-of-reserves attestation primitive on GenLayer. Register any stablecoin or tokenized asset with its public reserve pages and a required coverage ratio; any wallet can then trigger a real validator committee to fetch those pages live, extract reserves and liabilities, and reach consensus on `SOLVENT` / `UNDERCOLLATERALISED` - not one party's claim.

**Live on GenLayer's Bradbury testnet. Testnet only.**

## What this is for

SolvencyOracle itself is a standalone Intelligent Contract - a building block other contracts (or frontends) call into, not an app. PegWatch is the demonstration layer: register an asset, trigger a real attestation, and watch the actual consensus process play out, including the honest, real failure mode described below.

## A limitation shown, not hidden

`AttestButton`'s write flow checks the transaction's *actual resolved status* before showing a result - not "did the receipt merely avoid erroring." This matters more here than in this account's other GenLayer dashboards: SolvencyOracle's `attest()` asks every validator to fetch a live web page *and* run an LLM extraction within one consensus round, which is measurably heavier than a pure-LLM call. Confirmed live in [`solvency-oracle/CONTRACT.md`](https://github.com/HarrisonJL/solvency-oracle/blob/main/CONTRACT.md): one demo attestation reached clean consensus immediately; a second genuinely failed its first attempt (an 11-validator appeal round came back split) and needed a real retry. If a user sees "consensus not reached, try again" here, that's this real, disclosed characteristic - not a bug being papered over. The UI is built around it (an explicit "Try again" affordance) rather than around it never happening.

## Development

```bash
npm install
cp .env.local.example .env.local   # already points at the live contract
npm run dev                         # http://localhost:3000
npm test                            # bindAttestation unit tests (vitest)
```

`.env.local` needs `NEXT_PUBLIC_CONTRACT_ADDRESS` and `NEXT_PUBLIC_GENLAYER_CHAIN=bradbury`.

Stack: Next.js 16 + React 19 + Tailwind v4 + TypeScript via `genlayer-js`, matching this account's other GenLayer dashboards (Ballpark, Covenant Sentinel, Wizard's Coin) in structure and conventions.

## Contract

See [`contract/solvency_oracle.py`](contract/solvency_oracle.py) for a copy of the deployed source, and [github.com/HarrisonJL/solvency-oracle](https://github.com/HarrisonJL/solvency-oracle) for the real repo (tests, deploy scripts, full design writeup, and the live transaction evidence referenced above).
