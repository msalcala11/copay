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
