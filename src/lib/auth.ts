export const DASHBOARD_AUTH_COOKIE = 'dashboard_auth';

export async function createDashboardAuthToken(password: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`dashboard-auth:${password}`)
  );

  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}
