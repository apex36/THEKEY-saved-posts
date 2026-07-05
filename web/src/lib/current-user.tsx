'use client';

/**
 * Stubbed identity: a module-level store (readable by the non-React API
 * client) plus a React context for components. Every query key carries the
 * user id (see query-keys.ts), so switching identity isolates caches
 * structurally — no global `queryClient.clear()` needed. Clearing would only
 * force the outgoing user's still-mounted observers to refetch a stale key
 * before React swaps them over; per-user keys avoid that wasted round trip.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_USER, DEMO_USERS, type DemoUser } from './demo-users';

let currentUserId = DEFAULT_USER.id;

export function getCurrentUserId(): string {
  return currentUserId;
}

const CurrentUserContext = createContext<{
  user: DemoUser;
  switchUser: (next: DemoUser) => void;
} | null>(null);

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoUser>(DEFAULT_USER);

  useEffect(() => {
    const storedId = window.localStorage.getItem('demo-user-id');
    const stored = DEMO_USERS.find((u) => u.id === storedId);
    if (stored) {
      currentUserId = stored.id;
      setUser(stored);
    }
  }, []);

  const switchUser = (next: DemoUser) => {
    currentUserId = next.id;
    window.localStorage.setItem('demo-user-id', next.id);
    setUser(next);
  };

  return (
    <CurrentUserContext.Provider value={{ user, switchUser }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) throw new Error('useCurrentUser must be used inside CurrentUserProvider');
  return ctx;
}
