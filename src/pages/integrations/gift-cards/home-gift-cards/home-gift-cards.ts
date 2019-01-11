import {
  animate,
  query,
  style,
  transition,
  trigger
} from '@angular/animations';
import { Component, OnInit } from '@angular/core';
import { NavController } from 'ionic-angular';
import { debounceTime } from 'rxjs/operators';
import { ActionSheetProvider, AppProvider } from '../../../../providers';
import { GiftCardProvider } from '../../../../providers/gift-card/gift-card';
import {
  CardBrand,
  CardName,
  GiftCard
} from '../../../../providers/gift-card/gift-card.types';
import { CardCatalogPage } from '../card-catalog/card-catalog';
import { CardDetailsPage } from '../card-details/card-details';
import { PurchasedCardsPage } from '../purchased-cards/purchased-cards';
import { GiftCardItem } from './gift-card-item/gift-card-item';

@Component({
  selector: 'gift-cards',
  templateUrl: 'home-gift-cards.html',
  animations: [
    trigger('archiveAnimation', [
      transition(':leave', [
        style({
          opacity: 1
        }),
        animate(
          '400ms 0ms ease',
          style({
            opacity: 0,
            marginTop: '-88px',
            transform: 'translate3d(0, 88px, 0)'
          })
        )
      ])
    ]),
    trigger('preventInitialChildAnimations', [
      transition(':enter', [query(':enter', [], { optional: true })])
    ])
  ]
})
export class HomeGiftCards implements OnInit {
  public activeBrands: GiftCard[][];
  public appName: string;
  public disableArchiveAnimation: boolean = true; // Removes flicker on iOS when returning to home tab

  constructor(
    private actionSheetProvider: ActionSheetProvider,
    private appProvider: AppProvider,
    private giftCardProvider: GiftCardProvider,
    private navCtrl: NavController
  ) {}

  async ngOnInit() {
    this.appName = this.appProvider.info.userVisibleName;
    this.initGiftCards();
    this.addMockCards();
  }

  public buyGiftCards() {
    this.navCtrl.push(CardCatalogPage);
  }

  public onGiftCardAction(event, purchasedCards: GiftCard[]) {
    event.action === 'view'
      ? this.viewGiftCards(event.cardName, purchasedCards)
      : this.showArchiveSheet(event);
  }

  private async viewGiftCards(cardName: CardName, cards: GiftCard[]) {
    const activeCards = cards.filter(c => !c.archived);
    activeCards.length === 1
      ? this.navCtrl.push(CardDetailsPage, { card: activeCards[0] })
      : this.navCtrl.push(PurchasedCardsPage, { cardName });
  }

  private showArchiveSheet(event) {
    const brandCards = this.activeBrands
      .find(brandCards => brandCards[0].name === event.cardName)
      .filter(card => !card.archived);
    const sheetName =
      brandCards.length === 1 ? 'archive-gift-card' : 'archive-all-gift-cards';
    const archiveSheet = this.actionSheetProvider.createInfoSheet(sheetName, {
      brand: brandCards[0].brand
    });
    archiveSheet.present();
    archiveSheet.onDidDismiss(async confirm => {
      if (!confirm) return;
      await this.giftCardProvider.archiveAllCards(event.cardName);
    });
  }

  private async hideArchivedBrands() {
    this.disableArchiveAnimation = false;
    const purchasedBrands = await this.giftCardProvider.getPurchasedBrands();
    const { activeCardNames } = await this.getActiveGiftCards(purchasedBrands);
    const filteredBrands = this.activeBrands.filter(
      cards => activeCardNames.indexOf(cards[0].name) > -1
    );
    filteredBrands.length === this.activeBrands.length
      ? this.loadGiftCards()
      : (this.activeBrands = filteredBrands);
  }

  private async initGiftCards() {
    this.loadGiftCards();
    this.giftCardProvider.cardUpdates$
      .pipe(debounceTime(300))
      .subscribe(card =>
        card.archived ? this.hideArchivedBrands() : this.loadGiftCards()
      );
  }

  private getActiveGiftCards(purchasedBrands: GiftCard[][]) {
    const activeCards = purchasedBrands.filter(
      cards => cards.filter(c => !c.archived).length
    );
    const activeCardNames = activeCards.map(cards => cards[0].name);
    return { activeCards, activeCardNames };
  }

  private updatePendingGiftCards(purchasedBrands: GiftCard[][]) {
    const allCards = purchasedBrands.reduce(
      (allCards, brandCards) => [...allCards, ...brandCards],
      []
    );
    this.giftCardProvider.updatePendingGiftCards(allCards);
  }

  private async loadGiftCards() {
    this.disableArchiveAnimation = true;
    const activeCards = await this.giftCardProvider.getActiveCards();
    const activeBrands = this.groupCardsByBrand(activeCards);
    // const purchasedBrands = await this.giftCardProvider.getPurchasedBrands();
    // const { activeCards } = this.getActiveGiftCards(purchasedBrands);
    this.updatePendingGiftCards(activeBrands);
    this.activeBrands = activeBrands;
  }

  private groupCardsByBrand(cards: GiftCard[]): GiftCard[][] {
    return cards
      .reduce(
        (brands, c) => {
          const brandCards = brands.find(b => b[0].name === c.name);
          brandCards ? brandCards.push(c) : brands.push([c]);
          return brands;
        },
        [] as GiftCard[][]
      )
      .sort((a, b) => (a[0].name > b[0].name ? 1 : -1));
  }

  private addMockCards() {
    const gamestopCard: GiftCard = {
      name: CardName.papaJohns,
      brand: CardBrand.papaJohns,
      invoiceId: 'iNvOiCe1_papa',
      invoiceUrl: 'google.com',
      currency: 'USD',
      amount: 50,
      accessKey: 'aCcEsSkEy',
      // claimCode: '636 264 261 073 020 009 948 244 926 0',
      // claimCode: '6362642610730200099482449260',
      claimCode: '6156825125908294',

      // claimCode: '636 264 261 073',
      archived: false,
      date: 1535675247000,
      // pin: '52367',
      pin: '05482649',
      status: 'SUCCESS',
      uuid: 'aaksj'
    };
    console.log('gamestopCard', gamestopCard);
    return this.giftCardProvider.saveGiftCard(gamestopCard);
  }
}

export const HOME_GIFT_CARD_COMPONENTS = [HomeGiftCards, GiftCardItem];
