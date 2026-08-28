import { useMemo, type ReactNode } from 'react';
import { useLovelace, useAssets } from '@meshsdk/react';
import { useWalletStore } from '@/store/wallet-state';

const MAX_TOKENS = 5;
const HEX_PAIR_RE = /^(?:[0-9a-fA-F]{2})+$/;
const PALETTE = ['#6366F1', '#A855F7', '#F59E0B', '#EC4899', '#22C55E', '#14B8A6'];
const decoder = new TextDecoder();

function decodeAssetName(assetName: string): string {
  if (!HEX_PAIR_RE.test(assetName)) return assetName.slice(0, 8);
  const pairs = assetName.match(/.{2}/g)!;
  return decoder.decode(new Uint8Array(pairs.map((b) => parseInt(b, 16)))).slice(0, 8);
}

interface Part {
  label: string;
  value: number;
  color: string;
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="card-premium p-5">
      <h3 className="text-[13.5px] font-semibold text-[#C5C8D2]">Wallet composition</h3>
      {children}
    </div>
  );
}

export function WalletComposition() {
  const { connected } = useWalletStore();
  const lovelace = useLovelace();
  const assets = useAssets();

  const adaBalance = lovelace ? Number(lovelace) / 1_000_000 : 0;
  const tokenList = useMemo(() => assets ?? [], [assets]);

  const { parts, totalTokens } = useMemo(() => {
    const result: Part[] = [];
    if (adaBalance > 0) {
      result.push({ label: 'ADA', value: adaBalance, color: PALETTE[0] });
    }
    const visible = tokenList.slice(0, MAX_TOKENS);
    const remaining = tokenList.length - visible.length;

    visible.forEach((token, i) => {
      const ticker = token.assetName ? decodeAssetName(token.assetName) : `Token ${i + 1}`;
      result.push({
        label: ticker,
        value: Number(token.quantity) || 0,
        color: PALETTE[(i + 1) % PALETTE.length],
      });
    });

    if (remaining > 0) {
      result.push({
        label: `+${remaining} more`,
        value: 0,
        color: PALETTE[PALETTE.length - 1],
      });
    }

    return { parts: result, totalTokens: tokenList.length };
  }, [adaBalance, tokenList]);

  if (!connected) {
    return (
      <Card>
        <p className="mt-3 text-center text-xs text-[#6B6F7B]">Connect wallet to view</p>
      </Card>
    );
  }

  if (parts.length === 0) {
    return (
      <Card>
        <p className="mt-3 text-center text-xs text-[#6B6F7B]">No assets found</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mt-3.5 flex items-baseline gap-2">
        <span className="text-[28px] font-semibold tabular-nums tracking-[-0.02em] text-[#F4F5F7]">
          ₳ {adaBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
        <span className="text-[12px] text-[#6B6F7B]">
          {totalTokens} {totalTokens === 1 ? 'asset' : 'assets'}
        </span>
      </div>

      <div className="flex flex-col gap-[9px]">
        {parts.map((p) => (
          <div key={p.label} className="flex items-center gap-2.5">
            <span
              className="h-[9px] w-[9px] rounded-[3px]"
              style={{ backgroundColor: p.color }}
            />
            <span className="flex-1 truncate text-[12.5px] text-[#C5C8D2]">{p.label}</span>
            {p.label !== 'ADA' && p.value > 0 && <span className="font-mono text-[11px] text-[#8A8E9A]">{p.value.toLocaleString()}</span>}
          </div>
        ))}
      </div>
    </Card>
  );
}
