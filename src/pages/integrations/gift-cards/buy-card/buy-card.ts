import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { AmazonProvider } from '../../../../providers/amazon/amazon';
import {
  CardConifg,
  GiftCardProvider
} from '../../../../providers/gift-card/gift-card';
import { OnGoingProcessProvider } from '../../../../providers/on-going-process/on-going-process';
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
    private navParams: NavParams,
    private onGoingProcessProvider: OnGoingProcessProvider
  ) {
    const cardName = this.navParams.get('cardName');
    this.cardConfig = this.giftCardProvider.getCardConfig(cardName);
  }

  ngOnInit() {
    this.initAmazon();
  }

  cancel() {
    this.nav.pop();
  }

  private async initAmazon(): Promise<any> {
    if (!this.amazonProvider.currency) {
      this.onGoingProcessProvider.set('');
      await this.amazonProvider.setCurrencyByLocation();
      this.onGoingProcessProvider.clear();
    }
  }

  enterAmount() {
    this.nav.push(AmountPage, {
      nextPage: 'ConfirmCardPurchasePage',
      currency: this.amazonProvider.currency,
      fixedUnit: true,
      onlyIntegers: this.amazonProvider.onlyIntegers
    });
  }
}
