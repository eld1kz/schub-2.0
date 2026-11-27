import { markAllRead, openNotification } from "@/app/actions";
import { NotificationMenu } from "./notification-menu";
import { SubmitButton } from "@/components/ui";

export type Notification = { id: string; message: string; read: boolean; created_at: string };

const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

// The 20 most recent; each one opens its page and marks itself read
export function Notifications({ items, unread }: { items: Notification[]; unread: boolean }) {
  return (
    <NotificationMenu unread={unread}>
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="font-medium text-foreground">Notifications</span>
        {unread && (
          <form action={markAllRead}><SubmitButton variant="bare" className="text-xs text-muted hover:text-foreground">Mark all as read</SubmitButton></form>
        )}
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-muted">Nothing yet.</p>
      ) : (
        <ul className="max-h-96 divide-y divide-border overflow-y-auto">
          {items.map((n) => (
            <li key={n.id}>
              <form action={openNotification.bind(null, n.id)}>
                <SubmitButton variant="bare" className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-foreground/5">
                  <span aria-hidden className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "" : "bg-danger"}`} />
                  <span className="flex-1">
                    <span className={n.read ? "text-muted" : "text-foreground"}>{n.message}</span>
                    <span className="mt-0.5 block text-xs text-muted">{day(n.created_at)}</span>
                  </span>
                </SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}
    </NotificationMenu>
  );
}
