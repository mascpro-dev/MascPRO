"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  avatarUrl?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  xs: "w-8 h-8 text-[10px]",
  sm: "w-9 h-9 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-lg",
};

export default function AdminMemberAvatar({ avatarUrl, name, size = "md", className }: Props) {
  const [broken, setBroken] = useState(false);
  const initial = (name?.trim()?.charAt(0) || "?").toUpperCase();
  const showImg = avatarUrl && !broken;

  return (
    <div
      className={cn(
        "rounded-xl bg-[#C9A66B]/10 border border-zinc-800 flex items-center justify-center font-black text-[#C9A66B] shrink-0 overflow-hidden",
        sizes[size],
        className
      )}
    >
      {showImg ? (
        <img
          src={avatarUrl}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        initial
      )}
    </div>
  );
}
