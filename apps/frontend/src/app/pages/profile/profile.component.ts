import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable, switchMap, of } from 'rxjs';
import { ProfileService } from '../../core/profile/profile.service';
import { GdprService } from '../../core/gdpr/gdpr.service';
import { AuthService } from '../../core/auth/auth.service';
import { RoleRequestsService } from '../../core/role-requests/role-requests.service';
import type { UpdateProfileRequest, UserProfile } from '../../core/profile/profile.models';
import type { RoleRequestDto } from '../../core/role-requests/role-requests.models';

const AVATAR_COLORS = [
  '#5c6ef8', '#7c3aed', '#db2777', '#dc2626',
  '#d97706', '#059669', '#0891b2', '#4338ca',
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

@Component({
  selector: 'app-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, ReactiveFormsModule, DatePipe],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit, OnDestroy {
  private readonly profileService = inject(ProfileService);
  private readonly gdprService = inject(GdprService);
  private readonly authService = inject(AuthService);
  private readonly roleRequestsService = inject(RoleRequestsService);
  private readonly translate = inject(TranslateService);
  private readonly fb = inject(FormBuilder);

  protected readonly profile = signal<UserProfile | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMsg = signal<string | null>(null);
  protected readonly successMsg = signal<string | null>(null);
  protected readonly pendingAvatarFile = signal<File | null>(null);
  protected readonly avatarPreviewUrl = signal<string | null>(null);
  protected readonly deletingAccount = signal(false);
  protected readonly confirmDelete = signal(false);
  protected readonly submittingRoleRequest = signal(false);
  protected readonly roleRequestError = signal<string | null>(null);
  protected readonly myRoleRequest = signal<RoleRequestDto | null>(null);

  protected readonly currentRole = this.authService.userRole;

  protected readonly initials = computed(() => {
    const p = this.profile();
    if (!p) return '?';
    const f = p.firstName.trim()[0] ?? '';
    const l = p.lastName.trim()[0] ?? '';
    if (f || l) return (f + l).toUpperCase();
    return (p.userName[0] ?? '?').toUpperCase();
  });

  protected readonly avatarBgColor = computed(() => {
    const name = this.profile()?.userName ?? '';
    return AVATAR_COLORS[hashStr(name) % AVATAR_COLORS.length];
  });

  protected readonly displayName = computed(() => {
    const p = this.profile();
    if (!p) return '';
    const full = [p.firstName, p.lastName].filter(Boolean).join(' ');
    return full || p.userName;
  });

  protected readonly bioCharCount = computed(() =>
    (this.form.controls.bio.value?.length ?? 0)
  );

  protected readonly form = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    university: ['', [Validators.required, Validators.maxLength(200)]],
    faculty: ['', [Validators.maxLength(200)]],
    studyYear: [null as number | null, [Validators.min(1), Validators.max(6)]],
    bio: ['', [Validators.maxLength(500)]],
  });

  ngOnInit(): void {
    this.profileService.getProfile().subscribe({
      next: profile => {
        this.profile.set(profile);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });

    if (this.authService.userRole() !== 'Admin') {
      this.roleRequestsService.getMyRequest().subscribe({
        next: r => this.myRoleRequest.set(r),
        error: () => {},
      });
    }
  }

  protected startEdit(): void {
    const p = this.profile();
    if (!p) return;
    this.form.patchValue({
      firstName: p.firstName,
      lastName: p.lastName,
      university: p.university,
      faculty: p.faculty ?? '',
      studyYear: p.studyYear ?? null,
      bio: p.bio ?? '',
    });
    this.form.markAsUntouched();
    this.errorMsg.set(null);
    this.successMsg.set(null);
    this.editing.set(true);
  }

  protected cancelEdit(): void {
    this.editing.set(false);
    this.revokePreviewUrl();
    this.pendingAvatarFile.set(null);
    this.errorMsg.set(null);
  }

  protected onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      this.errorMsg.set('profile.validation.avatarType');
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.errorMsg.set('profile.validation.avatarSize');
      input.value = '';
      return;
    }

    this.revokePreviewUrl();
    this.avatarPreviewUrl.set(URL.createObjectURL(file));
    this.pendingAvatarFile.set(file);
    this.errorMsg.set(null);
  }

  protected saveProfile(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.saving.set(true);
    this.errorMsg.set(null);

    const v = this.form.value;
    const req: UpdateProfileRequest = {
      firstName: (v.firstName ?? '').trim(),
      lastName: (v.lastName ?? '').trim(),
      university: (v.university ?? '').trim(),
      faculty: v.faculty?.trim() || null,
      studyYear: v.studyYear ?? null,
      bio: v.bio?.trim() || null,
    };

    const pending = this.pendingAvatarFile();
    const upload$: Observable<unknown> = pending
      ? this.profileService.uploadAvatar(pending)
      : of(null);

    upload$
      .pipe(
        switchMap(() => this.profileService.updateProfile(req)),
        switchMap(() => this.profileService.getProfile()),
      )
      .subscribe({
        next: (profile: UserProfile) => {
          this.profile.set(profile);
          this.saving.set(false);
          this.editing.set(false);
          this.revokePreviewUrl();
          this.pendingAvatarFile.set(null);
          this.successMsg.set('profile.saveSuccess');
          setTimeout(() => this.successMsg.set(null), 3000);
        },
        error: () => {
          this.errorMsg.set('profile.saveError');
          this.saving.set(false);
        },
      });
  }

  protected submitRoleRequest(): void {
    if (this.submittingRoleRequest()) return;
    const current = this.authService.userRole();
    const requested: 'Student' | 'Teacher' = current === 'Student' ? 'Teacher' : 'Student';
    this.submittingRoleRequest.set(true);
    this.roleRequestError.set(null);
    this.roleRequestsService.submit(requested).subscribe({
      next: r => {
        this.myRoleRequest.set(r);
        this.submittingRoleRequest.set(false);
      },
      error: () => {
        this.roleRequestError.set('profile.roleRequestError');
        this.submittingRoleRequest.set(false);
      },
    });
  }

  protected exportData(): void {
    this.gdprService.exportData().subscribe({
      next: data => {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'physis-my-data.json';
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.errorMsg.set('gdpr.exportError'),
    });
  }

  protected requestDeleteAccount(): void {
    this.confirmDelete.set(true);
  }

  protected cancelDelete(): void {
    this.confirmDelete.set(false);
  }

  protected confirmDeleteAccount(): void {
    this.deletingAccount.set(true);
    this.gdprService.deleteAccount().subscribe({
      next: () => this.authService.logout(),
      error: () => {
        this.deletingAccount.set(false);
        this.confirmDelete.set(false);
        this.errorMsg.set('gdpr.deleteError');
      },
    });
  }

  private revokePreviewUrl(): void {
    const url = this.avatarPreviewUrl();
    if (url) URL.revokeObjectURL(url);
    this.avatarPreviewUrl.set(null);
  }

  ngOnDestroy(): void {
    this.revokePreviewUrl();
  }
}
