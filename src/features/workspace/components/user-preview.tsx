"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RoleBadge } from "@/features/workspace/components/role-badge";
import { WorkspaceRole } from "@/generated/prisma/enums";

// Avatar clicable: abre un widget con la foto en grande + nombre. El nombre
// (a un lado) enlaza al perfil del usuario.
export function UserPreview({
  workspaceId,
  userId,
  name,
  email,
  image,
  role,
  showName = true,
}: {
  workspaceId: string;
  userId: string;
  name: string | null;
  email: string;
  image?: string | null;
  role?: WorkspaceRole;
  showName?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const initial = (name?.trim()?.charAt(0) || email.charAt(0)).toUpperCase();
  const label = name?.trim() || email;

  return (
    <div className="relative flex min-w-0 items-center gap-2">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Ver foto de ${label}`}
        className="transition-ios shrink-0 rounded-full active:scale-95"
      >
        <Avatar>
          {image && <AvatarImage src={image} alt={label} />}
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
      </button>

      {showName && (
        <Link
          href={`/w/${workspaceId}/members/${userId}`}
          className="min-w-0 truncate text-sm font-medium hover:underline"
        >
          {label}
        </Link>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="glass-strong animate-in fade-in-0 zoom-in-95 absolute top-full left-0 z-30 mt-2 w-56 rounded-3xl p-4 text-center duration-150">
            <Avatar size="xl" className="mx-auto">
              {image && <AvatarImage src={image} alt={label} />}
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
            <p className="mt-2 truncate text-sm font-semibold">{label}</p>
            {name && (
              <p className="text-muted-foreground truncate text-xs">{email}</p>
            )}
            {role && (
              <div className="mt-2 flex justify-center">
                <RoleBadge role={role} />
              </div>
            )}
            <Link
              href={`/w/${workspaceId}/members/${userId}`}
              onClick={() => setOpen(false)}
              className="text-primary mt-3 block text-xs font-medium hover:underline"
            >
              Ver perfil
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
