import { Component } from '@angular/core';
import { Logger, ProfileProvider } from '../../../providers';

@Component({
  selector: 'page-receiving-wallets',
  templateUrl: 'receiving-wallets.html'
})
export class ReceivingWalletsPage {
  public wallets;
  public walletsGroups;

  constructor(
    private logger: Logger,
    private profileProvider: ProfileProvider
  ) {}

  ionViewWillEnter() {
    this.walletsGroups = this.profileProvider.orderedWalletsByGroup;
  }

  ionViewDidLoad() {
    this.logger.info('Loaded: ReceivingWalletsPage');
  }
}
