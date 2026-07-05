/**
 * Demo identities for the reviewer's user switcher.
 * Mirrors server/src/db/seed-data.ts — the ids must match the seed exactly.
 */
export interface DemoUser {
  id: string;
  name: string;
  role: 'student' | 'moderator';
}

export const DEMO_USERS: DemoUser[] = [
  { id: 'a1111111-1111-4111-8111-111111111111', name: 'Alice', role: 'student' }, // TypeScript 101
  { id: 'b2222222-2222-4222-8222-222222222222', name: 'Bilal', role: 'student' }, // Databases 201
  { id: 'c3333333-3333-4333-8333-333333333333', name: 'Chen', role: 'student' }, // both courses
  { id: 'd4444444-4444-4444-8444-444444444444', name: 'Mona', role: 'moderator' },
];

export const DEFAULT_USER = DEMO_USERS[0]!;
