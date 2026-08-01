// Marca de Qubi: una sola fuente de verdad para el favicon (icon.svg),
// el apple-icon y la marca dentro de la app. Colores fijos (no siguen el
// tema claro/oscuro) para que el símbolo se vea siempre igual.
const INK = "#14181f";
const VIOLET = "#a78bfa";
const GOLD = "#e0b357";

export function QubiMark({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ borderRadius: size * 0.22, overflow: "hidden" }}
    >
      <rect width="32" height="32" fill={INK} />
      <circle
        cx="15"
        cy="14"
        r="7.5"
        fill="none"
        stroke={VIOLET}
        strokeWidth="4.5"
      />
      <line
        x1="19"
        y1="18"
        x2="24.5"
        y2="24.5"
        stroke={VIOLET}
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <polygon
        fill={GOLD}
        points="6.5,20.7 7.5,23.63 10.59,23.67 8.12,25.53 9.03,28.48 6.5,26.7 3.97,28.48 4.88,25.53 2.41,23.67 5.5,23.63"
      />
    </svg>
  );
}
