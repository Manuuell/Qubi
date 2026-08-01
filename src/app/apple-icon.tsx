import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Apple no espera transparencia ni esquinas redondeadas propias en el
// apple-touch-icon: iOS aplica su propia máscara al añadir a inicio.
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#14181f",
      }}
    >
      <svg width="180" height="180" viewBox="0 0 32 32">
        <circle
          cx="15"
          cy="14"
          r="7.5"
          fill="none"
          stroke="#a78bfa"
          strokeWidth="4.5"
        />
        <line
          x1="19"
          y1="18"
          x2="24.5"
          y2="24.5"
          stroke="#a78bfa"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <polygon
          fill="#e0b357"
          points="6.5,20.7 7.5,23.63 10.59,23.67 8.12,25.53 9.03,28.48 6.5,26.7 3.97,28.48 4.88,25.53 2.41,23.67 5.5,23.63"
        />
      </svg>
    </div>,
    { ...size },
  );
}
