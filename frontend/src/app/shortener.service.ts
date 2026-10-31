import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

interface ShortUrlResponse {
	shortUrl: string;
}

@Injectable({ providedIn: 'root' })
export class ShortenerService {
	private readonly http = inject(HttpClient);

	createShortUrl(longUrl: string, customUrl?: string): Observable<ShortUrlResponse> {
		const requestBody = customUrl ? { longUrl, customUrl } : { longUrl };
		return this.http.post<ShortUrlResponse>('/api/url', requestBody);
	}

	checkCustomUrl(customUrl: string): Observable<boolean> {
		return this.http.get<boolean>(`/api/checkCustomUrl/${encodeURIComponent(customUrl)}`);
	}
}
