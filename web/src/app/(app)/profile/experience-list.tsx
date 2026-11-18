import Link from "next/link";
import { deleteExperience } from "@/app/actions";
import { formatPeriod, type Experience } from "@/lib/portfolio";
import { dividedList } from "../u/[id]/card";

const deleteFormId = (id: string) => `delete-experience-${id}`;

// Rendered inside the profile form. Delete buttons submit their own forms (below) through the
// `form` attribute, so pressing Enter in a profile field never hits a Delete button.
export function ExperienceList({ experiences }: { experiences: Experience[] }) {
  return (
    <div className="space-y-4">
      {experiences.length > 0 && (
        <ul className={dividedList}>
          {experiences.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-4">
              <div className="min-w-0 text-sm">
                <p className="font-semibold">{e.role}</p>
                <p className="text-zinc-500 dark:text-zinc-400">{e.company}</p>
                <p className="text-zinc-400 dark:text-zinc-500">{formatPeriod(e.start_date, e.end_date)}</p>
              </div>
              <div className="flex shrink-0 gap-3 text-sm">
                <Link href={`/profile/experience/${e.id}`} className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">Edit</Link>
                <button form={deleteFormId(e.id)} className="text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Link
        href="/profile/experience/new"
        className="block rounded-lg border border-dashed border-zinc-300 py-2 text-center text-sm font-medium text-zinc-600 hover:border-indigo-500 hover:text-indigo-600 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-indigo-400 dark:hover:text-indigo-400"
      >
        + Add experience
      </Link>
    </div>
  );
}

// Rendered outside the profile form: forms can't be nested
export function ExperienceDeleteForms({ experiences }: { experiences: Experience[] }) {
  return experiences.map((e) => (
    <form key={e.id} id={deleteFormId(e.id)} action={deleteExperience.bind(null, e.id)}>
      <input type="hidden" name="from" value="/profile" />
    </form>
  ));
}
