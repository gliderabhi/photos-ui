import { Injectable } from '@angular/core';

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
  setPage(p: PageMeta): void {
    const full = p.title === 'Photos' ? 'Photos — Private Photo Vault' : `${p.title} | Photos`;
    document.title = full;
    this.setMeta('description', p.description);
    this.setMeta('og:title', full, true);
    this.setMeta('og:description', p.description, true);
    this.setMeta('og:type', p.type ?? 'website', true);
    if (p.url)      this.setMeta('og:url', p.url, true);
    if (p.imageUrl) this.setMeta('og:image', p.imageUrl, true);
    this.setJsonLd(p.jsonLd ?? null);
  }

  private setMeta(nameOrProp: string, content: string, isOg = false): void {
    const attr = isOg ? 'property' : 'name';
    let el = document.querySelector(`meta[${attr}="${nameOrProp}"]`) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, nameOrProp);
      document.head.appendChild(el);
    }
    el.content = content;
  }

  private setJsonLd(data: object | null): void {
    let el = document.getElementById('json-ld') as HTMLScriptElement | null;
    if (!data) { el?.remove(); return; }
    if (!el) {
      el = document.createElement('script');
      el.id = 'json-ld';
      el.type = 'application/ld+json';
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(data);
  }
}
