import type { ReactNode } from "react";
import { deleteSharedProject, saveSharedProject } from "@/app/actions";
import { SHARED_PROJECT_PITCH_MAX, SHARED_PROJECT_RESULT_MAX, SHARED_PROJECT_TITLE_MAX, type SharedProject } from "@/lib/shared-projects";
import { EditDialog } from "../../u/[id]/edit-dialog";
import { FieldLabel, Input, FieldError } from "@/components/ui";

function Field({ label, name, children }: { label: string; name: string; children: ReactNode }) {
  return (
    <label className="block" data-missing={name === "title" ? "Add a name." : undefined}>
      <FieldLabel as="span" quiet>{label}</FieldLabel>
      {children}
      <FieldError field={name} />
    </label>
  );
}

// The owner records what the team built, or edits it. No `project` records a new one.
export function SharedProjectEdit({ teamId, project: p, trigger }: { teamId: string; project?: SharedProject; trigger: "edit" | "button" }) {
  return (
    <EditDialog
      title={p ? "Edit project" : "Record what we built"}
      trigger={trigger}
      label={p ? "Edit what we built" : "Record what we built"}
      cta="Record what we built"
      note="Every member is asked to confirm before it shows on their profile"
      save={saveSharedProject.bind(null, teamId)}
      remove={p && deleteSharedProject.bind(null, teamId)}
      submit={p ? "Save" : "Record"}
      done={p ? "Saved" : "Recorded. Your teammates are asked to confirm."}
    >
      <div className="space-y-4 py-4 sm:py-6">
        <Field label="Name" name="title"><Input name="title" defaultValue={p?.title} required maxLength={SHARED_PROJECT_TITLE_MAX} /></Field>
        <Field label="One line about it" name="pitch"><Input name="pitch" defaultValue={p?.pitch} maxLength={SHARED_PROJECT_PITCH_MAX} placeholder="Swap used textbooks with students on your campus" /></Field>
        <Field label={p?.image_url ? "Image (choose a file to replace the current one)" : "Image"} name="image"><Input name="image" type="file" accept="image/jpeg,image/png,image/webp" /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Link to it" name="url"><Input name="url" defaultValue={p?.url} placeholder="https://" /></Field>
          <Field label="Link to the code" name="repo_url"><Input name="repo_url" defaultValue={p?.repo_url} placeholder="https://github.com/..." /></Field>
        </div>
        <Field label="Result (optional)" name="result"><Input name="result" defaultValue={p?.result} maxLength={SHARED_PROJECT_RESULT_MAX} placeholder="2nd place" /></Field>
        {p && <p className="text-meta text-ink2">Changing the name or the result asks everyone who confirmed to confirm again.</p>}
      </div>
    </EditDialog>
  );
}
