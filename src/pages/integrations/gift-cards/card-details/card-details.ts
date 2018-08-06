import { Component } from '@angular/core';
import { NavParams } from 'ionic-angular';
import { ActionSheetProvider } from '../../../../providers/action-sheet/action-sheet';

export interface GiftCard {
  claimCode: string;
  amount: number;
  currency: string;
  date: number;
  archived: boolean;
}

@Component({
  selector: 'card-details-page',
  templateUrl: 'card-details.html'
})
export class CardDetailsPage {
  public card: GiftCard;

  constructor(
    private navParams: NavParams,
    private actionSheetProvider: ActionSheetProvider
  ) {}

  ngOnInit() {
    this.card = this.navParams.get('card');
  }

  copyClaimCode() {
    this.actionSheetProvider
      .createInfoSheet('copied-gift-card-claim-code', {
        claimCode: this.card.claimCode,
        website: 'amazon.com'
      })
      .present();
  }

  redeem() {}

  openArchiveSheet() {
    const sheet = this.actionSheetProvider.createInfoSheet('archive-gift-card');
    sheet.present();
    sheet.onDidDismiss(() => (this.card.archived = true));
  }

  showMoreOptions() {
    const sheet = this.actionSheetProvider.createOptionsSheet(
      'gift-card-options'
    );
    sheet.present();
    sheet.onDidDismiss(() => (this.card.archived = true));
  }
}
