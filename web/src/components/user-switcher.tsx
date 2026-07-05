'use client';

import { useTranslations } from 'next-intl';
import { DEMO_USERS } from '@/lib/demo-users';
import { useCurrentUser } from '@/lib/current-user';

export function UserSwitcher() {
  const t = useTranslations('header');
  const { user, switchUser } = useCurrentUser();
  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      <span className="hidden sm:inline">{t('signedInAs')}</span>
      <select
        value={user.id}
        onChange={(event) => {
          const next = DEMO_USERS.find((u) => u.id === event.target.value);
          if (next) switchUser(next);
        }}
        className="rounded-md border border-slate-300 bg-white px-2 py-1"
      >
        {DEMO_USERS.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name} — {t(u.role === 'moderator' ? 'role_moderator' : 'role_student')}
          </option>
        ))}
      </select>
    </label>
  );
}
