import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css',
})
export class LandingComponent {
  constructor() {
    inject(SeoService).setPage({
      title: 'Photos',
      description: 'Photos is a private, self-hosted photo storage app with Android auto-upload, encrypted folder storage, album organization, and favorites.',
      url: 'https://photos.sevis.store/',
      imageUrl: 'https://photos.sevis.store/photo-logo.png',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Photos',
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'Web, Android',
        description: 'Private self-hosted photo storage with Android auto-upload, encrypted folder protection, album organization, and favorites.',
        offers: { '@type': 'Offer', price: '0' },
        url: 'https://photos.sevis.store/',
      },
    });
  }
}
