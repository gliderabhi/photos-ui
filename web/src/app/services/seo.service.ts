import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';

export interface PageMeta {
  title: string;
  description: string;
  url?: string;
  imageUrl?: string;
  type?: string;
  jsonLd?: object;
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private title = inject(Title);
  private meta  = inject(Meta);
  private doc   = inject(DOCUMENT);

  setPage(p: PageMeta): void {
    const full = p.title === 'Photos' ? 'Photos — Private Photo Vault' : `${p.title} | Photos`;
    this.title.setTitle(full);
    this.meta.updateTag({ name: 'description', content: p.description });
    this.meta.updateTag({ property: 'og:title', content: full });
    this.meta.updateTag({ property: 'og:description', content: p.description });
    this.meta.updateTag({ property: 'og:type', content: p.type ?? 'website' });
    if (p.url)      this.meta.updateTag({ property: 'og:url', content: p.url });
    if (p.imageUrl) this.meta.updateTag({ property: 'og:image', content: p.imageUrl });
    this.setJsonLd(p.jsonLd ?? null);
  }

  private setJsonLd(data: object | null): void {
    let el = this.doc.getElementById('json-ld') as HTMLScriptElement | null;
    if (!data) { el?.remove(); return; }
    if (!el) {
      el = this.doc.createElement('script');
      el.id = 'json-ld';
      el.type = 'application/ld+json';
      this.doc.head.appendChild(el);
    }
    el.textContent = JSON.stringify(data);
  }
}
