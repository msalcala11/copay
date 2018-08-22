import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { AmazonProvider } from '../../../../providers/amazon/amazon';
import {
  CardConifg,
  GiftCardProvider
} from '../../../../providers/gift-card/gift-card';
import { AmountPage } from '../../../send/amount/amount';

@Component({
  selector: 'buy-card-page',
  templateUrl: 'buy-card.html'
})
export class BuyCardPage {
  cardConfig: CardConifg;

  constructor(
    private amazonProvider: AmazonProvider,
    private giftCardProvider: GiftCardProvider,
    private nav: NavController,
    private navParams: NavParams
  ) {}

  async ngOnInit() {
    const cardName = this.navParams.get('cardName');
    this.cardConfig = await this.giftCardProvider.getCardConfig(cardName);
  }

  cancel() {
    this.nav.pop();
  }

  enterAmount() {
    this.nav.push(AmountPage, {
      nextPage: 'ConfirmCardPurchasePage',
      cardName: this.cardConfig.name,
      currency: this.cardConfig.currency,
      fixedUnit: true,
      onlyIntegers: this.amazonProvider.onlyIntegers
    });
  }
}
