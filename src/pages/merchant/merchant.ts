import { Component } from '@angular/core';
import { NavParams } from 'ionic-angular';
import { ExternalLinkProvider } from '../../providers';
import { Merchant } from '../../providers/merchant/merchant';

@Component({
  selector: 'merchant-page',
  templateUrl: 'merchant.html'
})
export class MerchantPage {
  merchant: Merchant;

  constructor(
    private externalLinkProvider: ExternalLinkProvider,
    private navParams: NavParams
  ) {}

  async ngOnInit() {
    this.merchant = this.navParams.get('merchant');
  }

  goToMerchant() {
    const url = this.merchant.cta
      ? this.merchant.cta.link
      : this.merchant.domains[0];
    this.externalLinkProvider.open(url);
  }
}
