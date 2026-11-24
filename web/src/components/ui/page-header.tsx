import type { ReactNode } from "react";

// The top of a page (DESIGN.md): an optional small label above, the title, a line about the page, and the page's
// action on the right. `children` go under the description (an event's dates and who's going).
// `quietOnPhones`: the description only shows from sm up. `stack`: on phones the action goes under the title
// instead of beside it, full width, and the lines sit a little further apart (detail pages, with more under the
// title). `ruled`: a line under it, for forms.
// `className`: the space under it, which depends on what follows.
export function PageHeader({ title, eyebrow, description, action, quietOnPhones = false, stack = false, ruled = false, className = "", children }: {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  quietOnPhones?: boolean;
  stack?: boolean;
  ruled?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const layout = stack ? "flex-col sm:flex-row sm:items-end sm:justify-between" : "items-end justify-between";
  return (
    <header className={`flex gap-6 ${layout} ${ruled ? "border-b border-line2" : ""} ${className}`}>
      <div className={`flex min-w-0 flex-col ${stack ? "gap-2" : "gap-1.5"}`}>
        {eyebrow}
        <h1 className="text-2xl font-semibold text-balance sm:text-3xl">{title}</h1>
        {description && <p className={`text-base text-ink2 ${quietOnPhones ? "hidden sm:block" : ""}`}>{description}</p>}
        {children}
      </div>
      {action && <div className={`flex shrink-0 gap-2 ${stack ? "flex-col sm:flex-row sm:items-center" : "items-center"}`}>{action}</div>}
    </header>
  );
}
