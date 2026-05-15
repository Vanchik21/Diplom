export function parseIsAdmin(accessToken: string): boolean {
  try {
    const segment = accessToken.split('.')[1];
    if (!segment) return false;
    const json = atob(segment.replace(/-/g, '+').replace(/_/g, '/'));
    const payload: unknown = JSON.parse(json);
    if (typeof payload !== 'object' || payload === null) return false;
    const role: unknown = (payload as Record<string, unknown>)['role'];
    if (!role) return false;
    return Array.isArray(role) ? role.includes('Admin') : role === 'Admin';
  } catch {
    return false;
  }
}
