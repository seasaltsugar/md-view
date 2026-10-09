/** Extension version from the manifest ("dev" when running outside an extension, e.g. in tests). */
export function getVersion(): string {
  try {
    const chromeApi = (globalThis as { chrome?: { runtime?: { getManifest?: () => { version?: string } } } }).chrome;
    return chromeApi?.runtime?.getManifest?.().version ?? 'dev';
  } catch {
    return 'dev';
  }
}
