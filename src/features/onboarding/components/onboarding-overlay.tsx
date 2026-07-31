"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ONBOARDING_STEPS } from "../steps";
import { useMobileSidebar } from "@/features/workspace/components/mobile-sidebar-context";

type Rect = { top: number; left: number; width: number; height: number };

const PADDING = 8;

export function OnboardingOverlay({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const rafRef = useRef<number | null>(null);
  const { setOpen: setMobileSidebarOpen } = useMobileSidebar();

  const step = ONBOARDING_STEPS[index];
  const last = index === ONBOARDING_STEPS.length - 1;

  // Sigue al elemento objetivo en cada frame (cubre scroll y transiciones de
  // diseño) mientras el paso esté activo; sin objetivo, no hay spotlight.
  useEffect(() => {
    if (!step.target) {
      const id = requestAnimationFrame(() => setRect(null));
      return () => cancelAnimationFrame(id);
    }

    // En móvil el sidebar vive fuera de pantalla hasta que se abre; el propio
    // rAF de abajo corrige la posición del spotlight mientras se desliza.
    setMobileSidebarOpen(true);

    const el = document.querySelector<HTMLElement>(
      `[data-tour="${step.target}"]`,
    );
    if (!el) {
      const id = requestAnimationFrame(() => setRect(null));
      return () => cancelAnimationFrame(id);
    }

    el.scrollIntoView({ block: "center", behavior: "smooth" });

    function measure() {
      const r = el!.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      rafRef.current = requestAnimationFrame(measure);
    }
    measure();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.target]);

  function handleClose() {
    setMobileSidebarOpen(false);
    onClose();
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
      else if (e.key === "ArrowRight" || e.key === "Enter") next();
      else if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  function next() {
    if (last) handleClose();
    else setIndex((i) => i + 1);
  }
  function prev() {
    setIndex((i) => Math.max(0, i - 1));
  }

  const spot = rect
    ? {
        top: rect.top - PADDING,
        left: rect.left - PADDING,
        width: rect.width + PADDING * 2,
        height: rect.height + PADDING * 2,
      }
    : null;

  // Posiciona la tarjeta cerca del objetivo (a la derecha si hay sitio, si no
  // abajo), o centrada en pantalla para los pasos sin objetivo.
  const cardWidth = 320;
  let cardStyle: React.CSSProperties;
  if (spot) {
    const spaceRight = window.innerWidth - (spot.left + spot.width);
    const placeRight = spaceRight > cardWidth + 24;
    if (placeRight) {
      cardStyle = {
        top: Math.min(Math.max(spot.top, 16), window.innerHeight - 16 - 320),
        left: spot.left + spot.width + 16,
      };
    } else {
      const top = spot.top + spot.height + 16;
      const fitsBelow = top + 260 < window.innerHeight;
      cardStyle = {
        top: fitsBelow ? top : Math.max(16, spot.top - 260 - 16),
        left: Math.min(
          Math.max(spot.left, 16),
          window.innerWidth - cardWidth - 16,
        ),
      };
    }
  } else {
    cardStyle = {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    };
  }

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Fondo oscuro con "recorte" sobre el elemento resaltado. */}
      <div
        className="transition-ios absolute inset-0 bg-black/55"
        style={
          spot
            ? {
                clipPath: `polygon(0% 0%, 0% 100%, ${spot.left}px 100%, ${spot.left}px ${spot.top}px, ${spot.left + spot.width}px ${spot.top}px, ${spot.left + spot.width}px ${spot.top + spot.height}px, ${spot.left}px ${spot.top + spot.height}px, ${spot.left}px 100%, 100% 100%, 100% 0%)`,
              }
            : undefined
        }
        onClick={handleClose}
      />

      {spot && (
        <div
          className="border-primary/70 transition-ios pointer-events-none absolute rounded-2xl border-2"
          style={{
            top: spot.top,
            left: spot.left,
            width: spot.width,
            height: spot.height,
            boxShadow:
              "0 0 0 4px color-mix(in oklab, var(--primary) 25%, transparent)",
          }}
        />
      )}

      <div
        className="glass-strong animate-in fade-in-0 zoom-in-95 absolute w-[min(320px,calc(100vw-2rem))] rounded-3xl p-5 duration-200"
        style={cardStyle}
      >
        <button
          onClick={handleClose}
          aria-label="Cerrar guía"
          className="text-muted-foreground hover:bg-accent hover:text-foreground transition-ios absolute top-3 right-3 grid size-7 place-items-center rounded-full"
        >
          <X className="size-4" />
        </button>

        <p className="text-primary text-xs font-medium tracking-wide uppercase">
          Paso {index + 1} de {ONBOARDING_STEPS.length}
        </p>
        <h3 className="font-heading mt-1 text-lg font-semibold">
          {step.title}
        </h3>
        <p className="text-muted-foreground mt-1.5 text-sm">{step.body}</p>

        <div className="mt-4 flex items-center gap-1.5">
          {ONBOARDING_STEPS.map((_, i) => (
            <span
              key={i}
              className={cn(
                "transition-ios h-1.5 rounded-full",
                i === index ? "bg-primary w-4" : "bg-muted w-1.5",
              )}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2">
          {index > 0 && (
            <button
              onClick={prev}
              className="hover:bg-accent transition-ios rounded-full border px-3.5 py-1.5 text-sm"
            >
              Anterior
            </button>
          )}
          <button
            onClick={next}
            className="bg-primary text-primary-foreground hover:bg-primary/85 transition-ios ml-auto rounded-full px-4 py-1.5 text-sm font-medium"
          >
            {last ? "Entendido" : "Siguiente"}
          </button>
        </div>
      </div>
    </div>
  );
}
