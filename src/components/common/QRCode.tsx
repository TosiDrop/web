import { QRCodeSVG } from 'qrcode.react';
import { cn } from '@/lib/utils';

interface QRCodeProps {
  /** Cardano address (or any string) to encode. */
  value: string;
  /**
   * Optional ADA amount in lovelace. When provided, the QR encodes a CIP-13
   * `web+cardano:` URI so wallets that support deeplinking can prefill the amount.
   */
  amountLovelace?: number;
  /** Pixel size of the QR square (default 168). */
  size?: number;
  /** Extra classes on the white card wrapper. */
  className?: string;
}

function buildPayload(address: string, amountLovelace?: number): string {
  if (!amountLovelace || amountLovelace <= 0) return address;
  return `web+cardano:${address}?amount=${Math.floor(amountLovelace)}`;
}

export function QRCode({ value, amountLovelace, size = 168, className }: QRCodeProps) {
  const payload = buildPayload(value, amountLovelace);
  return (
    <div className={cn('inline-flex rounded-xl bg-white p-3 shadow-lg shadow-black/30', className)}>
      <QRCodeSVG
        value={payload}
        size={size}
        bgColor="#ffffff"
        fgColor="#000000"
        level="M"
      />
    </div>
  );
}
