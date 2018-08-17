import { Injectable } from '@angular/core';
import { AmazonProvider } from '../amazon/amazon';
import { MercadoLibreProvider } from '../mercado-libre/mercado-libre';

export interface CardConifg {
  cardImage: string;
  currency: string;
  icon: string;
  maxAmount: number;
  minAmount: number;
  name: string;
}

export interface GiftCard {
  amount: number;
  archived: boolean;
  claimCode: string;
  currency: string;
  date: number;
  invoiceUrl: string;
  invoiceId: string;
  name: string;
}

@Injectable()
export class GiftCardProvider {
  constructor(
    private amazonProvider: AmazonProvider,
    private mercadoLibreProvider: MercadoLibreProvider
  ) {}

  async getPurchasedCards(cardName: string): Promise<GiftCard[]> {
    const methodMap = {
      Amazon: this.amazonProvider.getPurchasedCards.bind(this.amazonProvider),
      'Mercado Livre': this.mercadoLibreProvider.getPurchasedCards.bind(
        this.mercadoLibreProvider
      )
    };
    const method = methodMap[cardName];
    const cards = await method();
    return cards.map(c => ({ ...c, name: cardName }));
  }

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
        // icon: 'assets/img/mercado-libre/meli-card-24px.png', // assets/img/mercado-libre/meli-card-24px.png

        icon: 'assets/img/mercado-libre/icon-ml.svg', // assets/img/mercado-libre/meli-card-24px.png
        cardImage: 'assets/img/mercado-libre/mercado-livre-card.png',
        maxAmount: 2000,
        minAmount: 15
      }
    ];
  }
}
