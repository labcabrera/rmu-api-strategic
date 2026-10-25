import { readFileSync } from 'fs';

let cached: string | undefined;

/**
 * Version of rmu-api-strategic in package.json (workspace spec 024, decision 2): `appVersion` of the export files.
 * package.json sits next to src/ and dist/, and the image copies it.
 */
export function appVersion(): string {
  if (cached === undefined) {
    try {
      const pkg = JSON.parse(readFileSync(new URL('../../../../../package.json', import.meta.url), 'utf8')) as { version?: string };
      cached = pkg.version ?? 'unknown';
    } catch {
      cached = 'unknown';
    }
  }
  return cached;
}
