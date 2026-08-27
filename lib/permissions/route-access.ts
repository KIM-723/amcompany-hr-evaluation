import { NAVIGATION_ITEMS } from '@/config/navigation';
import type { Role } from '@/types';

export function roleCanAccessRoute(role: Role, pathname: string): boolean {
  return rolesCanAccessRoute([role], pathname);
}

export function rolesCanAccessRoute(roles: readonly Role[], pathname: string): boolean {
  if (pathname === '/forbidden') return true;

  for (const item of NAVIGATION_ITEMS) {
    const child = item.children?.find(
      (candidate) =>
        pathname === candidate.href || pathname.startsWith(`${candidate.href}/`),
    );

    if (child) return child.roles.some((role) => roles.includes(role));

    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
      return item.roles.some((role) => roles.includes(role));
    }
  }

  return false;
}

export function getNavigationForRole(role: Role) {
  return getNavigationForRoles([role]);
}

export function getNavigationForRoles(roles: readonly Role[]) {
  return NAVIGATION_ITEMS.filter((item) => item.roles.some((role) => roles.includes(role))).map(
    (item) => ({
      ...item,
      children: item.children?.filter((child) =>
        child.roles.some((role) => roles.includes(role)),
      ),
    }),
  );
}
