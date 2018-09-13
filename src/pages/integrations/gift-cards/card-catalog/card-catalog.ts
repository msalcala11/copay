import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';

import { BuyCardPage } from '../buy-card/buy-card';

import {
  CardConifg,
  GiftCardProvider
} from '../../../../providers/gift-card/gift-card';

@Component({
  selector: 'card-catalog-page',
  templateUrl: 'card-catalog.html'
})
export class CardCatalogPage {
  public giftCards: CardConifg[];

  constructor(
    private giftCardProvider: GiftCardProvider,
    private navCtrl: NavController
  ) {}

  buyCard(cardConfig: CardConifg) {
    this.navCtrl.push(BuyCardPage, { cardName: cardConfig.name });
  }

  async ngOnInit() {
    this.giftCards = await this.giftCardProvider.getSupportedCards();
  }
}
