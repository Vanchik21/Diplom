import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

const CONSENT_KEY = 'physis_cookie_consent';

export type ConsentValue = 'accepted' | 'declined' | null;

@Injectable({ providedIn: 'root' })
export class GdprService {
  private readonly http = inject(HttpClient);

  readonly consent = signal<ConsentValue>(this.loadConsent());

  accept(): void {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    this.consent.set('accepted');
  }

  decline(): void {
    localStorage.setItem(CONSENT_KEY, 'declined');
    this.consent.set('declined');
  }

  exportData() {
    return this.http.get('/api/gdpr/export');
  }

  deleteAccount() {
    return this.http.delete('/api/gdpr/account');
  }

  private loadConsent(): ConsentValue {
    const val = localStorage.getItem(CONSENT_KEY);
    if (val === 'accepted' || val === 'declined') return val;
    return null;
  }
}
