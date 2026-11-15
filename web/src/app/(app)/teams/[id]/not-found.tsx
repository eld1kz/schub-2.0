import Link from "next/link";

export default function NotFound() {
  return (
    <p className="text-sm text-muted">
      This team doesn&apos;t exist or was deleted. <Link href="/teams" className="underline">Back to teams</Link>
    </p>
  );
}
