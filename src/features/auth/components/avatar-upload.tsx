"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { updateProfileImageAction } from "@/server/actions/account";

export function AvatarUpload({
  name,
  email,
  image,
}: {
  name: string | null;
  email: string;
  image: string | null;
}) {
  const [src, setSrc] = useState(image);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const initial = (name?.trim()?.charAt(0) || email.charAt(0)).toUpperCase();

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      try {
        const { url } = await updateProfileImageAction(formData);
        setSrc(url);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "No se pudo subir la imagen.",
        );
      }
    });
  }

  return (
    <div className="flex items-center gap-4">
      <div className="group relative">
        <Avatar size="xl">
          {src && <AvatarImage src={src} alt={name ?? email} />}
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          aria-label="Cambiar foto de perfil"
          className="glass transition-ios absolute inset-0 grid place-items-center rounded-full opacity-0 group-hover:opacity-100 disabled:opacity-100"
        >
          {pending ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Camera className="size-5" />
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={onFileChange}
        />
      </div>
      <div>
        <p className="text-sm font-medium">Foto de perfil</p>
        <p className="text-muted-foreground text-xs">PNG o JPG, máximo 5 MB.</p>
        {error && <p className="text-destructive mt-1 text-xs">{error}</p>}
      </div>
    </div>
  );
}
