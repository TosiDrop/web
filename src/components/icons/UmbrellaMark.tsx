interface UmbrellaMarkProps {
  className?: string;
  /** Stroke color — defaults to the cream canopy from the brand mark. */
  stroke?: string;
  strokeWidth?: number;
}

/**
 * Line-art rendering of the TosiDrop umbrella, pulled from the brand mark.
 * Used as a faint hero watermark and in empty states.
 */
export function UmbrellaMark({
  className,
  stroke = '#E7DCC2',
  strokeWidth = 1.3,
}: UmbrellaMarkProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M50 16c19 0 35 14 37 31 -7-5-14-5-18 0 -4-5-12-5-19 0 -7-5-15-5-19 0 -4-5-11-5-18 0C15 30 31 16 50 16z" />
      <path d="M50 12v4M50 47v30a8 8 0 01-15 0" />
    </svg>
  );
}
