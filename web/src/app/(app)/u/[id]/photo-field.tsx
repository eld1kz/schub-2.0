"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";

// The avatar circle opens the file picker; a chosen image shows in place of the current one before saving
export function PhotoField({ current }: { current: ReactNode }) {
  const [preview, setPreview] = useState("");

  // Let go of the previous preview when a new one replaces it, and when the modal closes
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  return (
    <label className="group flex w-24 shrink-0 cursor-pointer flex-col items-center gap-1.5 rounded-lg text-center has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent">
      <span className="relative block h-20 w-20 overflow-hidden rounded-lg transition-opacity group-hover:opacity-80">
        {preview ? <Image src={preview} alt="New photo preview" fill unoptimized className="object-cover" /> : current}
      </span>
      <span className="text-xs font-medium text-accent">{preview ? "New photo" : "Change photo"}</span>
      <input
        name="photo"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Photo (JPG, PNG or WebP, up to 4 MB)"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          setPreview(file ? URL.createObjectURL(file) : "");
        }}
      />
    </label>
  );
}
