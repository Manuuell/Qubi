"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { OnboardingOverlay } from "./components/onboarding-overlay";

type OnboardingContextValue = {
  start: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

function storageKey(userId: string) {
  return `qubi.onboarding.v1.${userId}`;
}

export function OnboardingProvider({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  // Primera vez que este usuario ve la app en este navegador: abre la guía sola.
  useEffect(() => {
    let seen = true;
    try {
      seen = localStorage.getItem(storageKey(userId)) === "1";
    } catch {
      // localStorage no disponible (modo privado, etc.): no insistimos.
    }
    if (!seen) {
      const id = setTimeout(() => setOpen(true), 500);
      return () => clearTimeout(id);
    }
  }, [userId]);

  function markSeen() {
    try {
      localStorage.setItem(storageKey(userId), "1");
    } catch {
      // Ignorar si no hay storage disponible.
    }
  }

  function close() {
    setOpen(false);
    markSeen();
  }

  function start() {
    setOpen(true);
  }

  return (
    <OnboardingContext.Provider value={{ start }}>
      {children}
      {open && <OnboardingOverlay onClose={close} />}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error("useOnboarding debe usarse dentro de OnboardingProvider");
  }
  return ctx;
}
