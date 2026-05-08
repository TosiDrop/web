import { QRCodeSVG } from 'qrcode.react';
import { cn } from '@/lib/utils';

interface QRCodeProps {
  value: string;
  amountLovelace?: number;
  size?: number;
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
