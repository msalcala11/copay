import { Component, ViewChild } from '@angular/core';
import { NavParams } from 'ionic-angular';
import { ReceivePage } from '../receive/receive';
import { AmountPage } from '../send/amount/amount';
import { WalletDetailsPage } from '../wallet-details/wallet-details';
import { WalletTabsProvider } from './wallet-tabs.provider';

@Component({
  template: `
  <ion-tabs selectedIndex="1" #tabs>
    <ion-tab [root]="receiveRoot" tabTitle="{{'Receive'|translate}}" tabIcon="tab-receive"></ion-tab>
    <ion-tab [root]="activityRoot" tabTitle="{{'Activity'|translate}}" tabIcon="tab-activity"></ion-tab>
    <ion-tab [root]="sendRoot" tabTitle="{{'Send'|translate}}" tabIcon="tab-send"></ion-tab>
  </ion-tabs>
  `
})
export class WalletTabsPage {
  @ViewChild('tabs') walletTabs: any;

  receiveRoot = ReceivePage;
  activityRoot = WalletDetailsPage;
  sendRoot = AmountPage;

  walletId: string;

  constructor(
    private navParams: NavParams,
    private walletTabsProvider: WalletTabsProvider
  ) {
    this.walletId = this.navParams.get('walletId');
  }

  ngAfterViewInit() {
    this.walletTabsProvider.setTabNav(this.walletTabs);
  }
}
