'use client';

import { useTranslations } from 'next-intl';
import { DEMO_USERS } from '@/lib/demo-users';
import { useCurrentUser } from '@/lib/current-user';

export function UserSwitcher() {
  const t = useTranslations('header');
  const { user, switchUser } = useCurrentUser();
  return (
    <label className="flex items-center gap-2 text-sm text-[#4F615A]">
      <span className="hidden sm:inline">{t('signedInAs')}</span>
      <select
        value={user.id}
        onChange={(event) => {
          const next = DEMO_USERS.find((u) => u.id === event.target.value);
          if (next) switchUser(next);
        }}
        className="h-9 rounded-[4px] border border-[#C7D2C8] bg-[#FFFDF6] px-2 outline-none transition hover:border-[#225E68] focus:border-[#225E68] focus:ring-2 focus:ring-[#225E68]/20"
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
