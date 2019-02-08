import { Component } from '@angular/core';
import { GiftCardProvider } from '../../../../providers/gift-card/gift-card';

@Component({
  selector: 'preload-card-images',
  template: `
    <img-loader
      style="display: none"
      *ngFor="let image of (cardImages | async)"
      [src]="image"
    ></img-loader>
  `
})
export class PreloadCardImages {
  cardImages: Promise<string[]>;
  constructor(private giftCardProvider: GiftCardProvider) {}

  async ngOnInit() {
    this.cardImages = this.getGiftCardImages();
  }

  async getGiftCardImages() {
    const supportedCards = await this.giftCardProvider.getSupportedCards();
    const imagesPerCard = supportedCards.map(c => [c.icon, c.cardImage]);
    return imagesPerCard.reduce(
      (allImages, imagesPerCard) => [...allImages, ...imagesPerCard],
      []
    );
  }
}
