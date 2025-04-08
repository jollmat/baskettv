import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ScrapService {

  constructor(
    private readonly http: HttpClient
  ) { }

  scrapUrl(url: string): Observable<unknown> {
    const safeUrl = encodeURIComponent(url);
    return this.http.get<unknown>(`${environment.scrapApi}/scrape/${safeUrl}`);
  }
}
