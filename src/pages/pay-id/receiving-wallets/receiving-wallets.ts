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
    this.walletsGroups = _.cloneDeep(
      this.profileProvider.orderedWalletsByGroup
    );
  }

  ionViewDidLoad() {
    this.logger.info('Loaded: ReceivingWalletsPage');
  }

  onSelectionChange(wallet) {
    const otherSelectedWallets = this.walletsGroups
      .flat()
      .filter(w => w.id !== wallet.id && wallet.selected);
    const alreadySelected = isCurrencyAlreadySelected(
      otherSelectedWallets,
      wallet.coin
    );
    if (alreadySelected) {
      this.showAlreadySelectedError(wallet.coin);
      setTimeout(() => (wallet.selected = false));
    }
  }

  getNumSelectedWallets() {
    return (
      this.walletsGroups &&
      this.walletsGroups.flat().filter(wallet => wallet.selected).length
    );
  }

  showAlreadySelectedError(coin: string) {
    this.actionSheetProvider
      .createInfoSheet('currency-already-selected', {
        coin
      })
      .present();
  }

  async finish() {
    const infoSheet = this.actionSheetProvider.createInfoSheet(
      'in-app-notification',
      {
        title: 'PayID Created',
        body: 'PayID successfully created.'
      }
    );
    await infoSheet.present();
    this.nav.popToRoot();
  }
}

function isCurrencyAlreadySelected(wallets: any, coin: string): boolean {
  return wallets.some(wallet => wallet.selected && wallet.coin === coin);
}
