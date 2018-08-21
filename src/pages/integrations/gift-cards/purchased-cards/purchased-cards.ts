import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
// import * as _ from 'lodash';

// Providers
import { AmazonProvider } from '../../../../providers/amazon/amazon';
import { ExternalLinkProvider } from '../../../../providers/external-link/external-link';
import {
  CardConifg,
  GiftCard,
  GiftCardProvider
} from '../../../../providers/gift-card/gift-card';
import { Logger } from '../../../../providers/logger/logger';
import { OnGoingProcessProvider } from '../../../../providers/on-going-process/on-going-process';
import { PlatformProvider } from '../../../../providers/platform/platform';
// import { PopupProvider } from '../../../../providers/popup/popup';
import { TimeProvider } from '../../../../providers/time/time';
import { BuyCardPage } from '../buy-card/buy-card';
import { CardDetailsPage } from '../card-details/card-details';
import { CardListItemComponent } from './card-list-item/card-list-item';

@Component({
  selector: 'purchased-cards-page',
  templateUrl: 'purchased-cards.html'
})
export class PurchasedCardsPage {
  public network: string;
  public giftCards: { [invoiceId: string]: GiftCard };
  public currentGiftCards: GiftCard[];
  public archivedGiftCards: GiftCard[];
  public updatingPending;
  public card;
  public invoiceId: string;
  public platformName: 'ios' | 'md' = 'md';
  public cardConfig: CardConifg;

  // private updateGiftCard: boolean;

  constructor(
    private amazonProvider: AmazonProvider,
    private externalLinkProvider: ExternalLinkProvider,
    private giftCardProvider: GiftCardProvider,
    private logger: Logger,
    private navCtrl: NavController,
    private navParams: NavParams,
    public platformProvider: PlatformProvider,
    // private popupProvider: PopupProvider,
    private onGoingProcessProvider: OnGoingProcessProvider,
    private timeProvider: TimeProvider
  ) {}

  ngOnInit() {
    this.platformName = this.platformProvider.isIOS ? 'ios' : 'md';
    const cardName = this.navParams.get('cardName');
    this.cardConfig = this.giftCardProvider.getCardConfig(cardName);
  }

  async ionViewDidLoad() {
    this.logger.info('ionViewDidLoad PurchasedCardsPage');
    this.network = this.amazonProvider.getNetwork();
    await this.initAmazon();
  }

  // ionViewWillEnter() {
  //   if (this.giftCards) {
  //     this.invoiceId = this.navParams.data.invoiceId;
  //     this.updateGiftCards()
  //       .then(() => {
  //         if (this.invoiceId) {
  //           let card = _.find(this.giftCards, {
  //             invoiceId: this.invoiceId
  //           });
  //           if (_.isEmpty(card)) {
  //             this.popupProvider.ionicAlert(null, 'Card not found');
  //             return;
  //           }
  //           this.updateGiftCard = this.checkIfCardNeedsUpdate(card);
  //           this.invoiceId = this.navParams.data.invoiceId = null;
  //         }
  //       })
  //       .catch(err => {
  //         this.logger.error('Amazon: could not update gift cards', err);
  //       });
  //   }
  // }

  addCard() {
    this.navCtrl.push(BuyCardPage, { cardName: this.cardConfig.name });
  }

  private async initAmazon(): Promise<any> {
    if (!this.amazonProvider.currency) {
      this.onGoingProcessProvider.set('');
      await this.amazonProvider.setCurrencyByLocation();
      this.onGoingProcessProvider.clear();
    }
    return this.giftCardProvider
      .getPurchasedCards(this.cardConfig.name)
      .then(cards => this.setGiftCards(cards))
      .catch(err => this.logger.error(err));
  }

  // private checkIfCardNeedsUpdate(card) {
  //   // Continues normal flow (update card)
  //   if (card.status == 'PENDING' || card.status == 'invalid') {
  //     return true;
  //   }
  //   // Check if card status FAILURE for 24 hours
  //   if (
  //     card.status == 'FAILURE' &&
  //     this.timeProvider.withinPastDay(card.date)
  //   ) {
  //     return true;
  //   }
  //   // Success: do not update
  //   return false;
  // }

  // private async updateGiftCards(): Promise<any> {
  //   return this.giftCardProvider
  //     .getPurchasedCards(this.cardConfig.name)
  //     .then(cards => this.setGiftCards(cards))
  //     .catch(err =>
  //       this.popupProvider.ionicAlert('Could not get gift cards', err)
  //     );
  // }

  setGiftCards(allCards) {
    console.log('allCards', allCards);
    this.currentGiftCards = allCards.filter(gc => !gc.archived);
    this.archivedGiftCards = this.currentGiftCards; // giftCards.filter(gc => gc.archived);
    this.updatePendingCards(this.currentGiftCards);
  }

  public updatePendingCards(cards: GiftCard[]) {
    this.giftCardProvider.updatePendingGiftCards(cards).subscribe(card => {
      console.log('card', card);
    });
  }

  // public updatePendingGiftCards = _.debounce(
  //   () => {
  //     this.updatingPending = {};
  //     this.updateGiftCards()
  //       .then(() => {
  //         let gcds = this.giftCards;
  //         _.forEach(gcds, dataFromStorage => {
  //           this.updateGiftCard = this.checkIfCardNeedsUpdate(dataFromStorage);

  //           if (this.updateGiftCard) {
  //             this.logger.debug('Creating / Updating gift card');
  //             this.updatingPending[dataFromStorage.invoiceId] = true;

  //             this.amazonProvider.createGiftCard(
  //               dataFromStorage,
  //               (err, giftCard) => {
  //                 this.updatingPending[dataFromStorage.invoiceId] = false;
  //                 if (err) {
  //                   this.logger.error('Error creating gift card:', err);
  //                   giftCard = giftCard || {};
  //                   giftCard['status'] = 'FAILURE';
  //                 }

  //                 if (giftCard.status != 'PENDING') {
  //                   let newData: Partial<GiftCardNewData> = {};

  //                   _.merge(newData, dataFromStorage, giftCard);

  //                   if (newData.status == 'expired') {
  //                     this.amazonProvider.savePendingGiftCard(
  //                       newData,
  //                       {
  //                         remove: true
  //                       },
  //                       () => {
  //                         this.updateGiftCards();
  //                       }
  //                     );
  //                     return;
  //                   }

  //                   this.amazonProvider.savePendingGiftCard(
  //                     newData,
  //                     null,
  //                     () => {
  //                       this.logger.debug('Amazon gift card updated');
  //                       this.updateGiftCards();
  //                     }
  //                   );
  //                 }
  //               }
  //             );
  //           }
  //         });
  //       })
  //       .catch(err => {
  //         this.logger.error(err);
  //       });
  //   },
  //   1000,
  //   {
  //     leading: true
  //   }
  // );

  public openExternalLink(url: string) {
    this.externalLinkProvider.open(url);
  }

  public goToCardDetails(card) {
    return this.navCtrl.push(CardDetailsPage, { card });
  }
}

export const PURCHASED_CARDS_PAGE_COMPONENTS = [
  PurchasedCardsPage,
  CardListItemComponent
];
