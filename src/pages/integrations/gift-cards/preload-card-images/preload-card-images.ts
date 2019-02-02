import { Component } from '@angular/core';
// import { CardName } from '../../../../providers/gift-card/gift-card.types';
import { GiftCardProvider } from '../../../../providers/gift-card/gift-card';

@Component({
  selector: 'preload-card-images',
  template: `
    <img
      style="display: none"
      *ngFor="let image of (cardImages | async)"
      [src]="image"
    />
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
