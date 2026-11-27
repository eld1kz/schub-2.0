"use client";

// On your own profile, under an award someone else added and you confirmed: takes you off it, after a check
export function RemoveMeButton({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action}>
      <button
        onClick={(e) => {
          if (!confirm("Remove yourself from this award? It won't show on your profile any more.")) e.preventDefault();
        }}
        className="h-8.5 text-sm text-ink2 hover:text-danger"
      >
        Remove me
      </button>
    </form>
  );
}
