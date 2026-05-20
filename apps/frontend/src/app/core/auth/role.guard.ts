import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const roleGuard = (role: 'Student' | 'Teacher'): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const userRole = auth.userRole();
  if (userRole === role || userRole === 'Admin') return true;
  return router.parseUrl('/');
};
