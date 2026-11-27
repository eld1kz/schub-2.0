import type { Metadata } from "next";

// Never indexed (the proxy also sends X-Robots-Tag and no-store for every /admin address)
export const metadata: Metadata = { title: "Admin · Schub", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
