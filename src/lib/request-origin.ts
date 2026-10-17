function parseOrigin(value: string): URL | null {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
        url.pathname !== '/' || url.search || url.hash) return null;
    return url;
  } catch { return null; }
}

/** Validate the browser origin against the public request host, not Next's bind address. */
export function hasAllowedOrigin(request: Request, configuredOrigin = process.env.APP_ORIGIN): boolean {
  const value = request.headers.get('origin');
  if (!value) return false;
  const origin = parseOrigin(value);
  if (!origin) return false;

  // Optional canonical origin when a reverse proxy replaces the Host header.
  // Do not trust arbitrary X-Forwarded-Host values as an additional allowlist.
  if (configuredOrigin) {
    const expected = parseOrigin(configuredOrigin);
    return Boolean(expected && origin.origin === expected.origin);
  }

  const host = request.headers.get('host');
  if (!host || /[\s,/@\\?#]/.test(host)) return false;
  const forwardedProtocol = request.headers.get('x-forwarded-proto');
  const protocol = forwardedProtocol === 'https' || forwardedProtocol === 'http'
    ? `${forwardedProtocol}:` : new URL(request.url).protocol;
  const expected = parseOrigin(`${protocol}//${host}`);
  return Boolean(expected && origin.origin === expected.origin);
}
