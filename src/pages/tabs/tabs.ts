import { Component, ViewChild } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
// import { HomePage } from '../home/home';
import { ReceivePage } from '../receive/receive';
// import { ScanPage } from '../scan/scan';
import { SendPage } from '../send/send';
// import { SettingsPage } from '../settings/settings';
import { WalletDetailsPage } from '../wallet-details/wallet-details';

@Component({
  templateUrl: 'tabs.html'
})
export class TabsPage {
  @ViewChild('tabs') tabs: any;

  // homeRoot = HomePage;
  // receiveRoot = ReceivePage;
  // scanRoot = ScanPage;
  // sendRoot = SendPage;
  // settingsRoot = SettingsPage;

  receiveRoot = ReceivePage;
  activityRoot = WalletDetailsPage;
  sendRoot = SendPage;

  rootParams: NavParams;

  constructor(private navParams: NavParams) {
    this.rootParams = this.navParams;
  }

  // public close() {
  //   this.navCtrl.pop();
  // }
}
