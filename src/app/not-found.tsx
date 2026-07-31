import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="bg-board bg-background flex min-h-screen items-center justify-center p-4">
      <div className="glass-strong w-full max-w-sm space-y-4 rounded-3xl p-8 text-center">
        <span className="bg-primary/10 text-primary mx-auto grid size-14 place-items-center rounded-full">
          <Compass className="size-6" />
        </span>
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            No encontramos esto
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            La página que buscas no existe, se movió o ya no tienes acceso a
            ella.
          </p>
        </div>
        <Button
          render={<Link href="/">Volver al inicio</Link>}
          className="w-full"
        />
      </div>
    </div>
  );
}
