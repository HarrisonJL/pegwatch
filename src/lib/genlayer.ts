import { createClient } from "genlayer-js";
import { localnet, testnetBradbury, studioDevnet } from "genlayer-js/chains";

type GenLayerClient = ReturnType<typeof createClient>;

// Studio Next requires genlayer-js v2's explicit fees API (see
// estimateAndAttachFees below) - it has no automatic fee estimation the way
// Bradbury (v1) did. This app targets Studio Next by default.
const CHAIN_NAME = process.env.NEXT_PUBLIC_GENLAYER_CHAIN ?? "studionext";

export const chain =
  CHAIN_NAME === "localnet" ? localnet : CHAIN_NAME === "bradbury" ? testnetBradbury : studioDevnet;

// Studio Next's writeContract/deployContract calls fail with
// "FeesDistributionMissing" unless fees are computed and attached
// explicitly - confirmed directly against the live network, not from docs.
export async function estimateAndAttachFees(client: GenLayerClient) {
  const fees = await (client as any).estimateTransactionFees({});
  return { distribution: fees.distribution, feeValue: fees.feeValue };
}

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";

export function getReadClient(): GenLayerClient {
  return createClient({ chain });
}

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export function getBrowserProvider(): EthereumProvider | null {
  if (typeof window === "undefined") return null;
  return window.ethereum ?? null;
}

export function getWriteClient(account: `0x${string}`): GenLayerClient {
  const provider = getBrowserProvider();
  return createClient({ chain, account, provider: provider ?? undefined });
}

export async function requestWalletAccount(): Promise<`0x${string}` | null> {
  const provider = getBrowserProvider();
  if (!provider) return null;
  const accounts = (await provider.request({
    method: "eth_requestAccounts",
  })) as string[];
  return (accounts[0] as `0x${string}`) ?? null;
}
