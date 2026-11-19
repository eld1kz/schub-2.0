import Image from "next/image";
import { photoUrl } from "@/lib/portfolio";

// Round photo (uploaded, else from Google), or initials when there's none. `className` sets the size; `square` is for the profile photo.
export function Avatar({ url, name, className, sizes, priority = false, square = false }: { url: string; name: string; className: string; sizes: string; priority?: boolean; square?: boolean }) {
  const photo = photoUrl(url);
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";
  return (
    <div className={`relative grid shrink-0 place-items-center overflow-hidden bg-chip font-semibold text-ink2 ${square ? "rounded-lg" : "rounded-full"} ${className}`}>
      {photo ? <Image src={photo} alt="" fill sizes={sizes} className="object-cover" priority={priority} /> : initials}
    </div>
  );
}
