import { rm } from 'node:fs/promises';
// Published APK downloads belong to the website, not inside the next APK.
await rm(new URL('../dist/android', import.meta.url), { recursive: true, force: true });
