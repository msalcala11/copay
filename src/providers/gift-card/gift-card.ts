import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { from } from 'rxjs/observable/from';
import { fromPromise } from 'rxjs/observable/fromPromise';
import { of } from 'rxjs/observable/of';
import { mergeMap } from 'rxjs/operators';
import { AmazonProvider } from '../amazon/amazon';
import { Logger } from '../logger/logger';
import { MercadoLibreProvider } from '../mercado-libre/mercado-libre';
import { TimeProvider } from '../time/time';

export enum CardBrand {
  amazon = 'Amazon',
  mercadoLibre = 'Mercado Livre'
}

export enum CardName {
  amazon = 'Amazon.com',
  amazonJapan = 'Amazon.co.jp',
  mercadoLibre = 'Mercado Livre'
}

export interface CardConifg {
  brand: string;
  cardImage: string;
  currency: string;
  icon: string;
  maxAmount: number;
  minAmount: number;
  name: CardName;
  redeemUrl: string;
  website: string;
}

export interface GiftCard {
  amount: number;
  brand: CardBrand;
  archived: boolean;
  claimCode: string;
  currency: string;
  date: number;
  invoiceUrl: string;
  invoiceId: string;
  name: CardName;
  status: string;
  updating: boolean;
}

@Injectable()
export class GiftCardProvider {
  constructor(
    private amazonProvider: AmazonProvider,
    private logger: Logger,
    private mercadoLibreProvider: MercadoLibreProvider,
    private timeProvider: TimeProvider
  ) {}

  async getPurchasedCards(cardName: CardName): Promise<GiftCard[]> {
    const getAmazonCards = this.amazonProvider.getPurchasedCards.bind(
      this.amazonProvider
    );
    const methodMap = {
      [CardName.amazon]: getAmazonCards,
      [CardName.amazonJapan]: getAmazonCards,
      [CardName.mercadoLibre]: this.mercadoLibreProvider.getPurchasedCards.bind(
        this.mercadoLibreProvider
      )
    };
    const method = methodMap[cardName];
    const [cards, cardConfig] = await Promise.all([
      method(),
      this.getCardConfig(cardName)
    ]);
    return cards.map(c => ({ ...c, name: cardName, brand: cardConfig.brand }));
  }

  async getCardConfig(cardName: CardName) {
    const supportedCards = await this.getSupportedCards();
    return supportedCards.filter(c => c.name === cardName)[0];
  }

  saveGiftCard() {}

  updatePendingGiftCards(cards: GiftCard[]): Observable<GiftCard> {
    const cardsNeedingUpdate = cards.filter(card =>
      this.checkIfCardNeedsUpdate(card)
    );
    return from(cardsNeedingUpdate).pipe(
      mergeMap(card =>
        this.amazonProvider.createCard(card).catch(err => {
          this.logger.error('Error creating gift card:', err);
          return of({ ...card, status: 'FAILURE' });
        })
      ),
      mergeMap((updatedFields, index) => {
        const card = cardsNeedingUpdate[index];
        return updatedFields.status !== 'PENDING'
          ? this.updatePreviouslyPendingCard(card, updatedFields)
          : of(card);
      })
    );
  }

  updatePreviouslyPendingCard(
    card: GiftCard,
    updatedFields: Partial<GiftCard>
  ) {
    const updatedCard = {
      ...card,
      ...updatedFields
    };
    return fromPromise(
      this.amazonProvider.saveGiftCard(updatedCard, {
        remove: updatedFields.status === 'expired'
      })
    ).map(() => {
      this.logger.debug('Amazon gift card updated');
      return updatedCard as GiftCard;
    });
  }

  private checkIfCardNeedsUpdate(card: GiftCard) {
    // Continues normal flow (update card)
    if (card.status === 'PENDING' || card.status === 'invalid') {
      return true;
    }
    // Check if card status FAILURE for 24 hours
    if (
      card.status === 'FAILURE' &&
      this.timeProvider.withinPastDay(card.date)
    ) {
      return true;
    }
    // Success: do not update
    return false;
  }

  async getSupportedCards() {
    const supportedCurrency = await this.amazonProvider.getSupportedCurrency();
    return this.getOfferedCards().filter(
      card => card.currency === supportedCurrency || card.currency === 'BRL'
    );
  }

  getOfferedCards(): CardConifg[] {
    return [
      {
        brand: CardBrand.amazon,
        currency: 'USD',
        icon: 'assets/img/amazon/amazon-icon.svg',
        cardImage: 'assets/img/amazon/amazon-gift-card.png',
        maxAmount: 2000,
        minAmount: 1,
        name: CardName.amazon,
        redeemUrl: 'https://www.amazon.com/gc/redeem?claimCode=',
        website: 'amazon.com'
      },
      {
        brand: CardBrand.amazon,
        currency: 'JPY',
        icon: 'assets/img/amazon/amazon-icon.svg',
        cardImage: 'assets/img/amazon/amazon-gift-card.png',
        maxAmount: 200000,
        minAmount: 100,
        name: CardName.amazonJapan,
        redeemUrl: 'https://www.amazon.co.jp/gc/redeem?claimCode=',
        website: 'amazon.co.jp'
      },
      {
        brand: CardBrand.mercadoLibre,
        currency: 'BRL',
        // icon: 'assets/img/mercado-libre/meli-card-24px.png', // assets/img/mercado-libre/meli-card-24px.png

        icon: 'assets/img/mercado-libre/icon-ml.svg', // assets/img/mercado-libre/meli-card-24px.png
        cardImage: 'assets/img/mercado-libre/mercado-livre-card.png',
        maxAmount: 2000,
        minAmount: 15,
        name: CardName.mercadoLibre,
        redeemUrl: null,
        website: 'mercadolivre.com.br'
      }
    ];
  }
}
