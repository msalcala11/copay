import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { Merchant } from '../../providers/merchant/merchant';

@Component({
  selector: 'merchant-page',
  templateUrl: 'merchant.html'
})
export class MerchantPage {
  merchant: Merchant;

  constructor(private nav: NavController, private navParams: NavParams) {}

  async ngOnInit() {
    this.merchant = this.navParams.get('merchant');
  }

  cancel() {
    this.nav.pop();
  }
}
