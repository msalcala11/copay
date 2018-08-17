import { Component } from '@angular/core';
import { NavParams } from 'ionic-angular';
import { ActionSheetProvider } from '../../../../providers/action-sheet/action-sheet';
import { AmazonProvider } from '../../../../providers/amazon/amazon';
import { ExternalLinkProvider } from '../../../../providers/external-link/external-link';
import {
  CardConifg,
  GiftCard,
  GiftCardProvider
} from '../../../../providers/gift-card/gift-card';

@Component({
  selector: 'card-details-page',
  templateUrl: 'card-details.html'
})
export class CardDetailsPage {
  public card: GiftCard;
  public cardConfig: CardConifg;

  constructor(
    private amazonProvider: AmazonProvider,
    private actionSheetProvider: ActionSheetProvider,
    private externalLinkProvider: ExternalLinkProvider,
    private giftCardProvider: GiftCardProvider,
    private navParams: NavParams
  ) {}

  ngOnInit() {
    this.card = this.navParams.get('card');
    this.cardConfig = this.giftCardProvider.getCardConfig(this.card.name);
  }

  copyClaimCode() {
    this.actionSheetProvider
      .createInfoSheet('copied-gift-card-claim-code', {
        claimCode: this.card.claimCode,
        website: 'amazon.com'
      })
      .present();
  }

  archive() {
    console.log('archive', this.card);
  }

  openArchiveSheet() {
    const sheet = this.actionSheetProvider.createInfoSheet('archive-gift-card');
    sheet.present();
    sheet.onDidDismiss(() => this.archive());
  }

  openExternalLink(url: string): void {
    this.externalLinkProvider.open(url);
  }

  redeem() {
    const url = `${this.amazonProvider.redeemAmazonUrl}${this.card.claimCode}`;
    this.externalLinkProvider.open(url);
  }

  showInvoice() {
    this.externalLinkProvider.open(this.card.invoiceUrl);
  }

  showMoreOptions() {
    const sheet = this.actionSheetProvider.createOptionsSheet(
      'gift-card-options'
    );
    sheet.present();
    sheet.onDidDismiss(data => {
      switch (data) {
        case 'archive':
          return this.openArchiveSheet();
        case 'view-invoice':
          return this.showInvoice();
      }
    });
  }
}