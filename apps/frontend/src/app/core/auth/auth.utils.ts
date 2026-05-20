type AppRole = 'Student' | 'Teacher' | 'Admin';

function decodeJwtPayload(accessToken: string): Record<string, unknown> | null {
  try {
    const segment = accessToken.split('.')[1];
    if (!segment) return null;
    const json = atob(segment.replace(/-/g, '+').replace(/_/g, '/'));
    const payload: unknown = JSON.parse(json);
    if (typeof payload !== 'object' || payload === null) return null;
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function parseIsAdmin(accessToken: string): boolean {
  const payload = decodeJwtPayload(accessToken);
  if (!payload) return false;
  const role = payload['role'];
  if (!role) return false;
  return Array.isArray(role) ? role.includes('Admin') : role === 'Admin';
}

export function parseRole(accessToken: string): AppRole | null {
  const payload = decodeJwtPayload(accessToken);
  if (!payload) return null;
  const role = payload['role'];
  if (!role) return null;
  const roles: unknown[] = Array.isArray(role) ? role : [role];
  if (roles.includes('Admin')) return 'Admin';
  if (roles.includes('Teacher')) return 'Teacher';
  if (roles.includes('Student')) return 'Student';
  return null;
}
