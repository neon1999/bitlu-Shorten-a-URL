import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { ShortenerService } from './shortener.service';

interface SavedLink {
  shortUrl: string;
  longUrl: string;
  createdAt: number;
}

@Component({
  imports: [DatePipe, DecimalPipe],
  selector: 'app-root',
  styleUrl: './workspace.scss',
  templateUrl: './workspace.html',
})
export class App {
  protected readonly originalUrl = signal('');
  protected readonly savedLinks = signal<SavedLink[]>(this.loadSavedLinks());
  protected readonly result = signal<SavedLink | null>(null);
  protected readonly errorMessage = signal('');
  protected readonly isSubmitting = signal(false);
  protected readonly copiedUrl = signal<string | null>(null);
  protected readonly linkCount = computed(() => this.savedLinks().length);
  private readonly storageKey = 'linklet.saved-links';

  constructor(private readonly shortener: ShortenerService) {}

  protected updateInput(event: Event): void {
    this.originalUrl.set((event.target as HTMLInputElement).value);
    this.errorMessage.set('');
  }

  protected shortenUrl(): void {
    const longUrl = this.normalizeUrl(this.originalUrl().trim());
    if (!longUrl) {
      this.errorMessage.set('Enter a valid web address to continue.');
      return;
    }

    this.errorMessage.set('');
    this.isSubmitting.set(true);
    this.shortener.createShortUrl(longUrl).subscribe({
      next: ({ shortUrl }) => {
        const savedLink = { shortUrl, longUrl, createdAt: Date.now() };
        this.result.set(savedLink);
        this.savedLinks.update((links) => [
          savedLink,
          ...links.filter((link) => link.shortUrl !== shortUrl),
        ].slice(0, 8));
        this.persistSavedLinks();
        this.originalUrl.set('');
        this.isSubmitting.set(false);
      },
      error: () => {
        this.errorMessage.set('We could not shorten that link. Check that the service is running and try again.');
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
