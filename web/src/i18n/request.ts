import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return {
    locale,
    // Pin the formatting zone so post dates render identically for every viewer
    // (and every CI machine) instead of falling back to the server's own zone —
    // seed timestamps are UTC, so UTC keeps "Jun 15" stable regardless of host.
    timeZone: 'UTC',
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
