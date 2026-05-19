import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { adminGuard } from './core/auth/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/shell/shell.component').then(m => m.ShellComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/home/home.component').then(m => m.HomeComponent),
      },
      {
        path: 'modules',
        loadComponent: () =>
          import('./pages/modules-browser/modules-browser.component').then(
            m => m.ModulesBrowserComponent,
          ),
      },
      {
        path: 'sim/:moduleId',
        loadComponent: () =>
          import('./pages/sim/sim.component').then(m => m.SimComponent),
      },
      {
        path: 'profile',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/profile/profile.component').then(m => m.ProfileComponent),
      },
      {
        path: 'my-scenarios',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/my-scenarios/my-scenarios.component').then(
            m => m.MyScenariosComponent,
          ),
      },
      {
        path: 'classes',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/my-classes/my-classes.component').then(m => m.MyClassesComponent),
      },
      {
        path: 'classes/:classroomId',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/classroom-detail/classroom-detail.component').then(
            m => m.ClassroomDetailComponent,
          ),
      },
      {
        path: 'analytics',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/analytics/analytics.component').then(m => m.AnalyticsComponent),
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/admin/admin.component').then(m => m.AdminComponent),
      },
      {
        path: 'privacy',
        loadComponent: () =>
          import('./pages/privacy/privacy.component').then(m => m.PrivacyComponent),
      },
      {
        path: 'about',
        loadComponent: () =>
          import('./pages/about/about.component').then(m => m.AboutComponent),
      },
    ],
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register.component').then(m => m.RegisterComponent),
  },
  { path: '**', redirectTo: '' },
];
