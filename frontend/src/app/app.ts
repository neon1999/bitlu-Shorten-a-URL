import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, OnDestroy, signal } from '@angular/core';
import { EMPTY, of, Subject, Subscription } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { ShortenerService } from './shortener.service';

interface SavedLink {
  shortUrl: string;
  longUrl: string;
  createdAt: number;
}

@Component({
  selector: 'app-root',
  styleUrl: './workspace.scss',
  templateUrl: './workspace.html',
})
export class App implements OnDestroy {
  protected readonly originalUrl = signal('');
  protected readonly savedLinks = signal<SavedLink[]>(this.loadSavedLinks());
  protected readonly result = signal<SavedLink | null>(null);
  protected readonly errorMessage = signal('');
  protected readonly customUrl = signal('');
  protected readonly customUrlMessage = signal('');
  protected readonly customUrlCheckState = signal<'idle' | 'invalid' | 'too-short' | 'checking' | 'available' | 'taken' | 'error'>('idle');
  protected readonly isCustomUrlBlocked = computed(() => {
    const state = this.customUrlCheckState();
    return state === 'invalid' || state === 'too-short' || state === 'checking' || state === 'taken' || state === 'error';
  });
  protected readonly isSubmitting = signal(false);
  protected readonly copiedUrl = signal<string | null>(null);
  protected readonly linkCount = computed(() => this.savedLinks().length);
  private readonly storageKey = 'linklet.saved-links';
  private readonly customUrlChanges = new Subject<string>();
  private readonly customUrlCheckSubscription: Subscription;

  constructor(private readonly shortener: ShortenerService) {
    this.customUrlCheckSubscription = this.customUrlChanges.pipe(
      distinctUntilChanged(),
      debounceTime(450),
      switchMap((customUrl) => {
        if (!customUrl || customUrl.length < 3 || !/^[A-Za-z0-9._~-]+$/.test(customUrl)) {
          return EMPTY;
        }

        this.customUrlCheckState.set('checking');
        this.customUrlMessage.set('Checking availability...');
        return this.shortener.checkCustomUrl(customUrl).pipe(
          map((available) => ({ customUrl, available, error: false })),
          catchError(() => of({ customUrl, available: false, error: true })),
        );
      }),
    ).subscribe(({ customUrl, available, error }) => {
      if (this.customUrl() !== customUrl) {
        return;
      }
      if (error) {
        this.customUrlMessage.set('We could not check that shortcode. Try again.');
        this.customUrlCheckState.set('error');
        return;
      }

      this.customUrlMessage.set(
        available ? 'This shortcode is available.' : 'This shortcode is already taken.',
      );
      this.customUrlCheckState.set(available ? 'available' : 'taken');
    });
  }

  protected updateInput(event: Event): void {
    this.originalUrl.set((event.target as HTMLInputElement).value);
    this.errorMessage.set('');
  }

  protected updateCustomUrl(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const customUrl = value.trim();
    this.customUrl.set(value);
    this.customUrlMessage.set('');
    this.customUrlCheckState.set('idle');
    this.customUrlChanges.next(value);

    if (!value) {
      return;
    }
    if (!/^[A-Za-z0-9._~-]+$/.test(value)) {
      this.customUrlMessage.set('Use only letters, numbers, hyphens, dots, underscores, or tildes.');
      this.customUrlCheckState.set('invalid');
      return;
    }
    if (customUrl.length < 3) {
      this.customUrlMessage.set('Enter at least 3 characters to check availability.');
      this.customUrlCheckState.set('too-short');
      return;
    }
    this.customUrlCheckState.set('checking');
    this.customUrlMessage.set('Checking availability...');
  }

  ngOnDestroy(): void {
    this.customUrlCheckSubscription.unsubscribe();
  }

  protected shortenUrl(): void {
    const longUrl = this.normalizeUrl(this.originalUrl().trim());
    const customUrl = this.customUrl().trim();
    if (!longUrl) {
      this.errorMessage.set('Enter a valid web address to continue.');
      return;
    }
    if (customUrl && this.customUrlCheckState() !== 'available') {
      return;
    }

    this.errorMessage.set('');
    this.isSubmitting.set(true);
    this.shortener.createShortUrl(longUrl, customUrl || undefined).subscribe({
      next: ({ shortUrl }) => {
        const savedLink = { shortUrl, longUrl, createdAt: Date.now() };
        this.result.set(savedLink);
        this.savedLinks.update((links) => [
          savedLink,
          ...links.filter((link) => link.shortUrl !== shortUrl),
        ].slice(0, 8));
        this.persistSavedLinks();
        this.originalUrl.set('');
        this.customUrl.set('');
        this.customUrlMessage.set('');
        this.customUrlCheckState.set('idle');
        this.customUrlChanges.next('');
        this.isSubmitting.set(false);
      },
      error: (error: HttpErrorResponse) => {
        if (customUrl && error.status === 409) {
          this.customUrlMessage.set('This shortcode is already taken.');
          this.customUrlCheckState.set('taken');
        } else {
          this.errorMessage.set('We could not shorten that link. Check that the service is running and try again.');
        }
        this.isSubmitting.set(false);
      },
    });
  }

  protected async copyLink(shortUrl: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(shortUrl);
      this.copiedUrl.set(shortUrl);
      window.setTimeout(() => {
        if (this.copiedUrl() === shortUrl) {
          this.copiedUrl.set(null);
        }
      }, 1800);
    } catch {
      this.errorMessage.set('Clipboard access is unavailable in this browser.');
    }
  }

  protected clearHistory(): void {
    this.savedLinks.set([]);
    localStorage.removeItem(this.storageKey);
  }

  private normalizeUrl(value: string): string | null {
    if (!value) {
      return null;
    }
    const scheme = /^[a-z][a-z\d+.-]*:\/\//i.exec(value)?.[0];
    if (scheme && !/^https?:\/\//i.test(scheme)) {
      return null;
    }
    const candidate = scheme ? value : `https://${value}`;
    try {
      const parsedUrl = new URL(candidate);
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:'
        ? parsedUrl.toString()
        : null;
    } catch {
      return null;
    }
  }

  private loadSavedLinks(): SavedLink[] {
    try {
      const storedLinks: unknown = JSON.parse(localStorage.getItem(this.storageKey) ?? '[]');
      if (!Array.isArray(storedLinks)) {
        return [];
      }
      return storedLinks.filter((entry): entry is SavedLink => {
        if (typeof entry !== 'object' || entry === null) {
          return false;
        }
        const link = entry as Record<string, unknown>;
        return typeof link['shortUrl'] === 'string' &&
          typeof link['longUrl'] === 'string' &&
          typeof link['createdAt'] === 'number';
      }).slice(0, 8);
    } catch {
      return [];
    }
  }

  private persistSavedLinks(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.savedLinks()));
  }
}
