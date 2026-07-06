import { reseed } from './reseed';

/** Reseed so every e2e run starts from the same data. */
export default function globalSetup(): void {
  reseed();
}
