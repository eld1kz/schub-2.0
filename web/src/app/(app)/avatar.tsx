import Image from "next/image";
import { mediaUrl } from "@/lib/portfolio";

// Round photo, or initials when there's none. `className` sets the size.
export function Avatar({ url, name, className, sizes, priority = false }: { url: string; name: string; className: string; sizes: string; priority?: boolean }) {
  const photo = mediaUrl(url);
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";
  return (
    <div className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full border border-border font-semibold ${className}`}>
      {photo ? <Image src={photo} alt="" fill sizes={sizes} className="object-cover" priority={priority} /> : initials}
    </div>
  );
}
