"use client";

import { AgencyMemberRole } from "@prisma/client";
import { Plus, Trash2, Copy, Check } from "lucide-react";
import { useState, useTransition } from "react";
import { createTeamInvite, deleteTeamInvite, removeTeamMember } from "./actions";
import { cn, initials } from "@/lib/utils";

type Member = {
  userId: string;
  name: string;
  email: string;
  role: AgencyMemberRole;
};

type Invite = {
  id: string;
  email: string;
  role: AgencyMemberRole;
  token: string;
  expiresAt: string | null;
};

export function TeamSection({
  members,
  invites,
  meUserId,
  canManage,
}: {
  members: Member[];
  invites: Invite[];
  meUserId: string;
  canManage: boolean;
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <section className="ll-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Team</h2>
        {canManage && !showForm && (
          <button onClick={() => setShowForm(true)} className="ll-btn-secondary text-xs">
            <Plus size={14} /> Invite
          </button>
        )}
      </div>

      {showForm && <InviteForm onClose={() => setShowForm(false)} />}

      <ul className="mt-5 divide-y divide-paper-border">
        {members.map((m) => (
          <MemberRow key={m.userId} member={m} canManage={canManage} isMe={m.userId === meUserId} />
        ))}
      </ul>

      {invites.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xs uppercase tracking-wider text-ink-subtle mb-2">
            Pending invites
          </h3>
          <ul className="divide-y divide-paper-border">
            {invites.map((i) => (
              <InviteRow key={i.id} invite={i} canManage={canManage} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function MemberRow({ member, canManage, isMe }: { member: Member; canManage: boolean; isMe: boolean }) {
  const [pending, startTransition] = useTransition();
  function remove() {
    if (!confirm(`Remove ${member.name} from the team?`)) return;
    const fd = new FormData();
    fd.set("userId", member.userId);
    startTransition(() => {
      removeTeamMember(fd);
    });
  }
  return (
    <li className="py-2.5 flex items-center gap-3 text-sm">
      <div className="w-8 h-8 rounded-full bg-accent-soft text-accent text-xs font-medium flex items-center justify-center">
        {initials(member.name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium">
          {member.name}
          {isMe && <span className="ml-2 text-[11px] text-ink-subtle">(you)</span>}
        </div>
        <div className="text-xs text-ink-muted">{member.email}</div>
      </div>
      <span className="text-[10px] uppercase tracking-wider text-ink-subtle">
        {member.role.toLowerCase()}
      </span>
      {canManage && !isMe && member.role !== "OWNER" && (
        <button
          onClick={remove}
          disabled={pending}
          className="ll-btn-ghost text-xs text-red-600"
        >
          <Trash2 size={13} />
        </button>
      )}
    </li>
  );
}

function InviteRow({ invite, canManage }: { invite: Invite; canManage: boolean }) {
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  async function copyLink() {
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    await navigator.clipboard.writeText(`${origin}/signup/team?token=${invite.token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  function revoke() {
    if (!confirm(`Revoke invite to ${invite.email}?`)) return;
    const fd = new FormData();
    fd.set("inviteId", invite.id);
    startTransition(() => {
      deleteTeamInvite(fd);
    });
  }

  return (
    <li className="py-2.5 flex items-center gap-3 text-sm">
      <div className="flex-1 min-w-0">
        <div className="font-medium">{invite.email}</div>
        <div className="text-xs text-ink-muted">
          {invite.role.toLowerCase()}
          {invite.expiresAt && ` · expires ${new Date(invite.expiresAt).toLocaleDateString()}`}
        </div>
      </div>
      <button onClick={copyLink} className="ll-btn-secondary text-xs">
        {copied ? <Check size={13} /> : <Copy size={13} />}
        {copied ? "Copied" : "Copy link"}
      </button>
      {canManage && (
        <button onClick={revoke} disabled={pending} className="ll-btn-ghost text-xs text-red-600">
          <Trash2 size={13} />
        </button>
      )}
    </li>
  );
}

function InviteForm({ onClose }: { onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await createTeamInvite(fd);
      if (!res.ok) setError(res.error);
      else onClose();
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 border-t border-paper-border pt-4 grid sm:grid-cols-3 gap-2 items-end">
      <div className="sm:col-span-2">
        <label className="ll-label">Email</label>
        <input name="email" type="email" required className="ll-input" />
      </div>
      <div>
        <label className="ll-label">Role</label>
        <select name="role" defaultValue="BOOKER" className="ll-input">
          <option value="BOOKER">Booker</option>
          <option value="PRODUCTION">Production</option>
          <option value="ACCOUNTS">Accounts</option>
          <option value="OWNER">Owner</option>
        </select>
      </div>
      {error && <p className="sm:col-span-3 text-xs text-red-600">{error}</p>}
      <div className="sm:col-span-3 flex items-center justify-end gap-2">
        <button type="button" onClick={onClose} className="ll-btn-ghost text-sm">
          Cancel
        </button>
        <button type="submit" disabled={pending} className="ll-btn-primary text-sm">
          {pending ? "Sending…" : "Send invite"}
        </button>
      </div>
    </form>
  );
}
