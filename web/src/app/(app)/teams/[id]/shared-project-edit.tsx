import type { ReactNode } from "react";
import { deleteSharedProject, saveSharedProject } from "@/app/actions";
import { SHARED_PROJECT_PITCH_MAX, SHARED_PROJECT_RESULT_MAX, SHARED_PROJECT_TITLE_MAX, type SharedProject } from "@/lib/shared-projects";
import { EditDialog, FieldError } from "../../u/[id]/edit-dialog";

function Field({ label, name, children }: { label: string; name: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
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
        <Field label="Name" name="title"><input name="title" defaultValue={p?.title} required maxLength={SHARED_PROJECT_TITLE_MAX} className="input" /></Field>
        <Field label="One line about it" name="pitch"><input name="pitch" defaultValue={p?.pitch} maxLength={SHARED_PROJECT_PITCH_MAX} placeholder="Swap used textbooks with students on your campus" className="input" /></Field>
        <Field label={p?.image_url ? "Image (choose a file to replace the current one)" : "Image"} name="image"><input name="image" type="file" accept="image/jpeg,image/png,image/webp" className="input" /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Link to it" name="url"><input name="url" defaultValue={p?.url} placeholder="https://" className="input" /></Field>
          <Field label="Link to the code" name="repo_url"><input name="repo_url" defaultValue={p?.repo_url} placeholder="https://github.com/..." className="input" /></Field>
        </div>
        <Field label="Result (optional)" name="result"><input name="result" defaultValue={p?.result} maxLength={SHARED_PROJECT_RESULT_MAX} placeholder="2nd place" className="input" /></Field>
        {p && <p className="text-meta text-ink2">Changing the name or the result asks everyone who confirmed to confirm again.</p>}
      </div>
    </EditDialog>
  );
}
