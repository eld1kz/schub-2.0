import {
  Avatar,
  Button,
  ButtonLink,
  CheckChip,
  Chip,
  ChipList,
  CloseIcon,
  EmptyState,
  ErrorText,
  Field,
  FieldLabel,
  IconButton,
  Input,
  MonoLabel,
  PageHeader,
  Row,
  Section,
  SectionTitle,
  Select,
  Switch,
  Tabs,
  Textarea,
  Timeline,
  TimelineEntry,
  ToggleChip,
  type AvatarSize,
  type ButtonSize,
  type ButtonVariant,
} from "@/components/ui";
import { ModalDemo } from "./modal-demo";

const variants: ButtonVariant[] = ["primary", "secondary", "accent", "quiet", "danger"];
const sizes: ButtonSize[] = ["xs", "sm", "md", "touch", "lg"];
const avatarSizes: AvatarSize[] = ["xs", "sm", "md", "lg", "xl", "2xl", "profile"];
const colors = ["background", "foreground", "ink2", "muted", "border", "line2", "chip", "accent", "accent-soft", "open", "danger"] as const;
const swatch: Record<(typeof colors)[number], string> = {
  background: "bg-background",
  foreground: "bg-foreground",
  ink2: "bg-ink2",
  muted: "bg-muted",
  border: "bg-border",
  line2: "bg-line2",
  chip: "bg-chip",
  accent: "bg-accent",
  "accent-soft": "bg-accent-soft",
  open: "bg-open",
  danger: "bg-danger",
};
const typeSizes = [
  ["display", "text-display"],
  ["3xl", "text-3xl"],
  ["2xl", "text-2xl"],
  ["xl", "text-xl"],
  ["lg", "text-lg"],
  ["base", "text-base"],
  ["sm", "text-sm"],
  ["meta", "text-meta"],
  ["xs", "text-xs"],
] as const;
// A GitHub avatar, one of the two outside hosts photoUrl allows
const photo = "https://avatars.githubusercontent.com/u/9919";
const pencil = (
  <IconButton label="Edit">
    <svg viewBox="0 0 16 16" aria-hidden className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth={1.5}>
      <path d="M11.5 2.5l2 2L6 12l-2.5.5L4 10z" />
    </svg>
  </IconButton>
);

// The design system's components in every state, in one color scheme. `scheme` also keeps the two copies' ids apart.
export function Sheet({ scheme }: { scheme: "light" | "dark" }) {
  const id = (name: string) => `${scheme}-${name}`;
  return (
    <div className={`flex flex-col bg-background px-4 py-8 text-foreground sm:px-6 ${scheme === "dark" ? "scheme-only-dark" : "scheme-only-light"}`}>
      <MonoLabel as="p" className="pb-6">{scheme}</MonoLabel>

      <Section title="Color">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {colors.map((c) => (
            <li key={c} className="flex items-center gap-2 text-sm">
              <span className={`h-8 w-8 rounded-sm border border-border ${swatch[c]}`} />
              {c}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Type">
        <div className="flex flex-col gap-3">
          {typeSizes.map(([name, cls]) => (
            <p key={name} className={`${cls} truncate`}>
              <span className="font-mono text-xs text-muted">{name} </span>Find teammates for hackathons
            </p>
          ))}
          <p className="font-mono text-meta">IBM Plex Mono for skills and small labels</p>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-col gap-4">
          {variants.map((v) => (
            <div key={v} className="flex flex-wrap items-center gap-3">
              <MonoLabel className="w-20">{v}</MonoLabel>
              {sizes.map((s) => <Button key={s} type="button" variant={v} size={s}>{s}</Button>)}
              <Button type="button" variant={v} disabled>Disabled</Button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <MonoLabel className="w-20">other</MonoLabel>
            <ButtonLink href="/design" variant="secondary">A link</ButtonLink>
            <Button type="button" full>Full width on phones</Button>
            <IconButton label="Close"><CloseIcon /></IconButton>
            {pencil}
          </div>
        </div>
      </Section>

      <Section title="Fields">
        <div className="flex max-w-form flex-col gap-4">
          <Field id={id("d-name")} label="Name" required>
            <Input id={id("d-name")} defaultValue="Jiwoo Park" />
          </Field>
          <Field id={id("d-org")} label="Organizer" optional hint="Shown under the title">
            <Input id={id("d-org")} placeholder="Microsoft for Startups" />
          </Field>
          <Field id={id("d-url")} label="Link" required error="That link doesn't open. Check it and try again.">
            <Input id={id("d-url")} defaultValue="https://exampl" />
          </Field>
          <Field id={id("d-off")} label="Disabled">
            <Input id={id("d-off")} defaultValue="Can't change this" disabled />
          </Field>
          <Field id={id("d-about")} label="About you">
            <Textarea id={id("d-about")} rows={3} defaultValue="Backend developer, free most evenings." />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id={id("d-type")} label="Type">
              <Select id={id("d-type")} placeholder="Pick a type" defaultValue="" options={[{ value: "hackathon", label: "Hackathon" }, { value: "competition", label: "Competition" }]} />
            </Field>
            <Field id={id("d-mode")} label="Work mode">
              <Select id={id("d-mode")} defaultValue="remote" required={false} placeholder="Not set" options={[{ value: "remote", label: "Remote" }, { value: "in_person", label: "In person" }]} />
            </Field>
          </div>
          <div className="flex flex-wrap gap-3">
            <Input small placeholder="Small (filter bars)" className="max-w-search" />
            <Input search placeholder="Search (over a list)" className="max-w-search" />
          </div>
          <div>
            <FieldLabel as="span" quiet>A quiet label, in grouped forms</FieldLabel>
            <Input placeholder="Seoul" />
          </div>
          <Switch name={id("d-switch-on")} label="On" defaultChecked />
          <Switch name={id("d-switch-off")} label="Off" defaultChecked={false} />
          <ErrorText>An error under a field or in a row</ErrorText>
          <ErrorText size="sm">An error for the whole form</ErrorText>
        </div>
      </Section>

      <Section title="Chips">
        <div className="flex flex-col gap-4">
          <ChipList>
            {["Go", "PostgreSQL", "Figma"].map((s) => <Chip key={s}>{s}</Chip>)}
          </ChipList>
          <ChipList className="gap-2">
            <Chip size="md" className="font-medium">React<span className="ml-2 text-meta font-normal text-muted">3 projects</span></Chip>
            <Chip size="md">Swift</Chip>
          </ChipList>
          <div className="flex flex-wrap gap-1.5">
            <ToggleChip on>Picked</ToggleChip>
            <ToggleChip on={false}>Not picked</ToggleChip>
            <ToggleChip on={false} disabled>Disabled</ToggleChip>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            <CheckChip name={id("d-lang")} value="English" defaultChecked>English</CheckChip>
            <CheckChip name={id("d-lang")} value="Korean">Korean</CheckChip>
            <CheckChip name={id("d-lang")} value="Russian">Russian</CheckChip>
          </div>
          <div className="flex flex-wrap gap-4">
            <MonoLabel>Hackathon</MonoLabel>
            <MonoLabel tone="muted">Muted</MonoLabel>
            <MonoLabel tone="accent">1st place</MonoLabel>
          </div>
        </div>
      </Section>

      <Section title="Avatars">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-end gap-4">
            {avatarSizes.map((s) => <Avatar key={s} url="" name="Jiwoo Park" size={s} />)}
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <Avatar url={photo} name="GitHub" size="xl" />
            <Avatar url="" name="Open Team" size="xl" ring="open" />
            <Avatar url="" name="My Connection" size="xl" ring="connection" />
            <Avatar url={photo} name="GitHub" size="2xl" square />
            <span className="flex -space-x-1.5">
              <Avatar url="" name="A B" size="xs" stacked />
              <Avatar url="" name="C D" size="xs" stacked ring="open" />
              <Avatar url="" name="E F" size="xs" stacked ring="connection" />
            </span>
          </div>
        </div>
      </Section>

      <Section title="Tabs">
        <div className="flex flex-col gap-6">
          <Tabs
            label="Example tabs"
            tabs={[
              { href: "/design", label: "Discover", current: true },
              { href: "/design?requests", label: "Requests", current: false, count: 2, alert: true },
              { href: "/design?connections", label: "Connections", current: false },
            ]}
          />
          <Tabs
            label="Tabs with counts"
            tabs={[
              { href: "/design", label: "All", current: true, count: 24 },
              { href: "/design?h", label: "Hackathons", current: false, count: 12 },
              { href: "/design?c", label: "Competitions", current: false, count: 0 },
            ]}
          />
        </div>
      </Section>

      <Section title="Rows">
        <div>
          <SectionTitle title="Teams recruiting" count={2} action={<Button type="button" variant="secondary" size="sm">Post a team</Button>} />
          <Row actions={<Button type="button" variant="secondary" size="sm">Ask to join</Button>}>
            <MonoLabel as="p">Imagine Cup 2027</MonoLabel>
            <p className="text-lg font-semibold">AI study buddy</p>
            <p className="text-sm"><span className="text-muted">Needs:</span> Designer, Backend</p>
          </Row>
          <Row media={<Avatar url="" name="Jiwoo Park" size="xl" ring="open" />} actions={<Button type="button" variant="secondary" size="sm">Connect</Button>}>
            <p className="text-base font-semibold">Jiwoo Park</p>
            <p className="text-sm text-ink2">Backend developer at KU</p>
          </Row>
          <Row stack actions={<><Button type="button" size="sm">Accept</Button><Button type="button" variant="secondary" size="sm">Decline</Button></>}>
            <p className="text-base font-semibold">Stacked on phones</p>
            <p className="text-sm text-ink2">Wide actions go under the content</p>
          </Row>
          <Row center actions={<Button type="button" variant="quiet" size="sm">Withdraw</Button>}>
            <p className="text-base font-semibold">Centered actions</p>
          </Row>
        </div>
      </Section>

      <Section title="Sections" count={3} add={<button type="button" className="text-sm font-semibold text-accent">+ Add</button>}>
        <p className="text-base text-ink2">The title sits in a 152px label column from sm up, with a count and an add link under it.</p>
      </Section>
      <Section title="Owner" owner edit={pencil}>
        <p className="text-base text-ink2">With `owner`, a third column holds the pencil.</p>
      </Section>
      <Section title="Empty, quiet" quiet owner edit={pencil} editOnHover>
        <EmptyState title="Add your experience" action={<Button type="button" variant="accent" size="touch" full>+ Add experience</Button>}>
          Internships, club roles, TA positions, research.
        </EmptyState>
      </Section>
      <Section title="Empty list">
        <EmptyState>Nobody yet. Be the first.</EmptyState>
      </Section>

      <Section title="Timeline">
        <Timeline>
          <TimelineEntry period="Mar 2026 – Now" title="Backend developer" meta="Daangn · Internship · Seoul" description="Built the listing search service." chips={["Go", "PostgreSQL"]} current edit={pencil} />
          <TimelineEntry period="2025" title="Club lead" meta="KU Robotics Club" />
        </Timeline>
      </Section>

      <Section title="Page headers">
        <div className="flex flex-col gap-8">
          <PageHeader title="Teams" action={<Button type="button">Post a team</Button>} />
          <PageHeader title="Microsoft Imagine Cup 2027" stack eyebrow={<MonoLabel>Competition</MonoLabel>} description="Microsoft" action={<Button type="button" variant="secondary">Official page ↗</Button>} />
          <PageHeader title="Post a team" description="Say what you're building and which roles you still need." ruled className="pb-6" />
        </div>
      </Section>

      <Section title="Modal">
        <div className="flex flex-wrap gap-3">
          <ModalDemo width="dialog" id={id("modal-name")} />
          <ModalDemo width="measure" id={id("modal-name-2")} />
        </div>
      </Section>
    </div>
  );
}
