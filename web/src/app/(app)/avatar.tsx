import Image from "next/image";
import { photoUrl } from "@/lib/portfolio";

// Ring classes for someone open to a team (profiles.open_to_collaborate): green, set off from the photo.
// Exported for avatar stacks, which draw their own rings.
export const openRing = "ring-2 ring-open ring-offset-2 ring-offset-background";

// Round photo (uploaded, else from Google or GitHub), or initials when there's none. `className` sets the size; `square` is for the profile photo.
// `open`: they're open to a team, so the photo gets a green ring. Pages say it in words where it matters.
export function Avatar({ url, name, className, sizes, priority = false, square = false, open = false }: { url: string; name: string; className: string; sizes: string; priority?: boolean; square?: boolean; open?: boolean }) {
  const photo = photoUrl(url);
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";
  return (
    <div className={`relative grid shrink-0 place-items-center overflow-hidden bg-chip font-semibold text-ink2 ${square ? "rounded-lg" : "rounded-full"} ${open ? openRing : ""} ${className}`}>
      {photo ? <Image src={photo} alt="" fill sizes={sizes} className="object-cover" priority={priority} /> : initials}
    </div>
  );
}
