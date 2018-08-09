import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { AmazonProvider } from '../../../../providers/amazon/amazon';
import { OnGoingProcessProvider } from '../../../../providers/on-going-process/on-going-process';
import { AmountPage } from '../../../send/amount/amount';

@Component({
  selector: 'buy-card-page',
  templateUrl: 'buy-card.html'
})
export class BuyCardPage {
  constructor(
    private amazonProvider: AmazonProvider,
    private nav: NavController,
    private onGoingProcessProvider: OnGoingProcessProvider
  ) {}

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
