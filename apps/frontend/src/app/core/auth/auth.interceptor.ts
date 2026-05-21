import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, switchMap, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router      = inject(Router);
  const token       = authService.accessToken();

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError(error => {
      if (error.status === 403) {
        authService.logout();
        router.navigate(['/login'], { queryParams: { reason: 'deactivated' } });
        return throwError(() => error);
      }

      if (error.status !== 401 || req.url.includes('/api/auth/')) {
        return throwError(() => error);
      }

      const refresh$ = authService.refresh();
      if (!refresh$) {
        authService.logout();
        return throwError(() => error);
      }

      return refresh$.pipe(
        switchMap(newTokens => {
          const retryReq = req.clone({
            setHeaders: { Authorization: `Bearer ${newTokens.accessToken}` },
          });
          return next(retryReq);
        }),
        catchError(refreshError => {
          authService.logout();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
