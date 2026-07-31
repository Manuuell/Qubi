"use client";

import { createContext, useContext, useState } from "react";

type MobileSidebarContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const MobileSidebarContext = createContext<MobileSidebarContextValue | null>(
  null,
);

export function MobileSidebarProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <MobileSidebarContext.Provider value={{ open, setOpen }}>
      {children}
    </MobileSidebarContext.Provider>
  );
}

export function useMobileSidebar() {
  const ctx = useContext(MobileSidebarContext);
  if (!ctx) {
    throw new Error(
      "useMobileSidebar debe usarse dentro de MobileSidebarProvider",
    );
  }
  return ctx;
}
