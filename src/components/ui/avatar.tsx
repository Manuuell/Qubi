import * as React from "react";
import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";

import { cn } from "@/lib/utils";

const avatarSizes = {
  sm: "size-6 text-[0.6rem]",
  default: "size-8 text-xs",
  lg: "size-12 text-base",
  xl: "size-20 text-2xl",
} as const;

function Avatar({
  className,
  size = "default",
  ...props
}: AvatarPrimitive.Root.Props & { size?: keyof typeof avatarSizes }) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "bg-muted relative flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        avatarSizes[size],
        className,
      )}
      {...props}
    />
  );
}

function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("size-full object-cover", className)}
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  ...props
}: AvatarPrimitive.Fallback.Props) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-accent text-accent-foreground flex size-full items-center justify-center font-medium",
        className,
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback };
