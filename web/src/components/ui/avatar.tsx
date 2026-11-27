import Image from "next/image";
import { photoUrl } from "@/lib/portfolio";

// A person's photo (uploaded, else from Google or GitHub), or their initials (DESIGN.md)
export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "profile";
// Rings: open to a team is green, one of your connections is the accent; both set off from the photo.
// `stacked` avatars overlap, so their ring is a solid border in the page color, or green / accent.
export type AvatarRing = "open" | "connection" | null;

const sizes: Record<AvatarSize, { box: string; text: string; px: string }> = {
  xs: { box: "h-6 w-6", text: "text-xs", px: "24px" },
  sm: { box: "h-7 w-7", text: "text-xs", px: "28px" },
  md: { box: "h-8 w-8", text: "text-xs", px: "32px" },
  lg: { box: "h-10 w-10", text: "text-meta", px: "40px" },
  xl: { box: "h-11 w-11", text: "text-sm", px: "44px" },
  "2xl": { box: "h-20 w-20", text: "text-xl", px: "80px" },
  profile: { box: "h-[72px] w-[72px] sm:h-[120px] sm:w-[120px]", text: "text-xl sm:text-2xl", px: "(min-width: 640px) 120px, 72px" },
};
const rings = {
  open: "ring-2 ring-open ring-offset-2 ring-offset-background",
  connection: "ring-2 ring-accent ring-offset-2 ring-offset-background",
};
const stackedRings = { open: "ring-2 ring-open", connection: "ring-2 ring-accent", none: "ring-2 ring-background" };

export function Avatar({ url, name, size = "md", ring = null, stacked = false, square = false, priority = false, className = "" }: {
  url: string;
  name: string;
  size?: AvatarSize;
  ring?: AvatarRing;
  stacked?: boolean;
  // The profile photo
  square?: boolean;
  priority?: boolean;
  className?: string;
}) {
  const photo = photoUrl(url);
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";
  const s = sizes[size];
  const ringClass = stacked ? stackedRings[ring ?? "none"] : ring ? rings[ring] : "";
  return (
    <div className={`relative grid shrink-0 place-items-center overflow-hidden bg-chip font-semibold text-ink2 ${square ? "rounded-md" : "rounded-full"} ${s.box} ${s.text} ${ringClass} ${className}`}>
      {photo ? <Image src={photo} alt="" fill sizes={s.px} className="object-cover" priority={priority} /> : initials}
    </div>
  );
}
