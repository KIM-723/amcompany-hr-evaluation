import { NAVIGATION_ITEMS } from '@/config/navigation';
import type { Role } from '@/types';

export function roleCanAccessRoute(role: Role, pathname: string): boolean {
  for (const item of NAVIGATION_ITEMS) {
    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
      const child = item.children?.find(
        (candidate) =>
          pathname === candidate.href || pathname.startsWith(`${candidate.href}/`),
      );

      if (child) return child.roles.includes(role);
      return item.roles.includes(role);
    }
  }

  return false;
}

export function getNavigationForRole(role: Role) {
  return NAVIGATION_ITEMS.filter((item) => item.roles.includes(role)).map((item) => ({
    ...item,
    children: item.children?.filter((child) => child.roles.includes(role)),
  }));
}
