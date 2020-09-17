import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import * as _ from 'lodash';

import {
  ActionSheetProvider,
  Logger,
  ProfileProvider
} from '../../../providers';

@Component({
  selector: 'page-receiving-wallets',
  templateUrl: 'receiving-wallets.html'
})
export class ReceivingWalletsPage {
  public walletsGroups;

  constructor(
    private actionSheetProvider: ActionSheetProvider,
    private logger: Logger,
    private profileProvider: ProfileProvider,
    private nav: NavController
  ) {}

  ionViewWillEnter() {
    this.walletsGroups = _.clone(this.profileProvider.orderedWalletsByGroup);
  }

  ionViewDidLoad() {
    this.logger.info('Loaded: ReceivingWalletsPage');
  }

  async finish() {
    const infoSheet = this.actionSheetProvider.createInfoSheet(
      'in-app-notification',
      {
        title: 'PayID Created',
        body: 'PayID successfully created.'
      }
    );
    console.log('this.wallets', this.walletsGroups);
    const selectedWallets = this.walletsGroups
      .flat()
      .filter(wallet => wallet.selected);
    console.log('selectedWallets', selectedWallets);
    await infoSheet.present();
    this.nav.popToRoot();
  }
}
