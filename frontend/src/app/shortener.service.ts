import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

interface ShortUrlResponse {
	shortUrl: string;
}

@Injectable({ providedIn: 'root' })
export class ShortenerService {
	private readonly http = inject(HttpClient);

	createShortUrl(longUrl: string): Observable<ShortUrlResponse> {
		return this.http.post<ShortUrlResponse>('/api/url', { longUrl });
	}
}
