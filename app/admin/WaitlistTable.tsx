"use client";

import { useTransition } from "react";
import { markInvited } from "./actions";

type Entry = {
  id: string;
  email: string;
  source: string | null;
  joinedAt: Date;
  invited: boolean;
};

export function WaitlistTable({ entries }: { entries: Entry[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border text-muted tracking-widest uppercase">
            <th className="text-left py-2 pr-4">Email</th>
            <th className="text-left py-2 pr-4">Source</th>
            <th className="text-left py-2 pr-4">Joined</th>
            <th className="text-left py-2">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {entries.map((e) => (
            <WaitlistRow key={e.id} entry={e} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WaitlistRow({ entry }: { entry: Entry }) {
  const [isPending, startTransition] = useTransition();

  const handleInvite = () => {
    startTransition(() => markInvited(entry.id));
  };

  return (
    <tr className="text-sub hover:text-primary transition-colors">
      <td className="py-2 pr-4 font-mono">{entry.email}</td>
      <td className="py-2 pr-4 text-muted">{entry.source ?? "—"}</td>
      <td className="py-2 pr-4 text-muted">
        {new Date(entry.joinedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </td>
      <td className="py-2">
        {entry.invited ? (
          <span className="text-safe tracking-widest uppercase">Invited</span>
        ) : (
          <button
            onClick={handleInvite}
            disabled={isPending}
            className="text-muted hover:text-primary transition-colors tracking-widest uppercase disabled:opacity-50"
          >
            {isPending ? "···" : "Mark invited"}
          </button>
        )}
      </td>
    </tr>
  );
}
