import { Injectable } from '@angular/core';
import { AmazonProvider } from '../amazon/amazon';

export interface CardConifg {
  cardImage: string;
  currency: string;
  icon: string;
  maxAmount: number;
  minAmount: number;
  name: string;
}

@Injectable()
export class GiftCardProvider {
  constructor(private amazonProvider: AmazonProvider) {}

  getPurchasedCards(cardName: string) {}

  getCardConfig(cardName: string) {
    return this.getOfferedCards().filter(c => c.name === cardName)[0];
  }

  getOfferedCards(): CardConifg[] {
    return [
      {
        currency: 'USD',
        icon: 'assets/img/amazon/amazon-icon.svg',
        cardImage: 'assets/img/amazon/amazon-gift-card.png',
        maxAmount: 2000,
        minAmount: 1,
        name: 'Amazon'
      },
      {
        name: 'Mercado Livre',
        currency: 'BRL',
        icon: 'assets/img/mercado-libre/icon-ml.svg',
        cardImage: 'assets/img/mercado-libre/mercado-livre-card.png',
        maxAmount: 2000,
        minAmount: 15
      }
    ];
  }
}
