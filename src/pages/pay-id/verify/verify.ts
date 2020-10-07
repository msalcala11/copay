import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import {
  ActionSheetProvider,
  AddressBookProvider,
  IncomingDataProvider
} from '../../../providers';
import { PayIdDetails } from '../../../providers/pay-id/pay-id';

@Component({
  selector: 'verify-pay-id-page',
  templateUrl: 'verify.html'
})
export class VerifyPayIdPage {
  code: string[] = [
    '23423',
    '59872',
    '39712',
    '00510',
    '23423',
    '59872',
    '39712',
    '00510',
    '23423',
    '59872',
    '39712',
    '00510'
  ];
  codeRows: string[][];
  params: {
    payIdDetails: PayIdDetails;
  };
  constructor(
    private ab: AddressBookProvider,
    private incomingDataProvider: IncomingDataProvider,
    private actionSheetProvider: ActionSheetProvider,
    private nav: NavController,
    private navParams: NavParams
  ) {
    this.codeRows = chunkify(this.code, 4);
    this.params = this.navParams.get('incomingDataParams');
    console.log('codeRows', this.codeRows);
  }

  public async next() {
    await this.saveToContacts();
  }

  public async somethingIsWrong() {
    const sheet = this.actionSheetProvider.createInfoSheet(
      'pay-id-something-wrong',
      { payIdDetails: this.params.payIdDetails }
    );
    sheet.present();
    sheet.onDidDismiss(() => this.nav.pop());
  }

  private async saveToContacts() {
    await this.ab.add({
      name: '',
      email: '',
      // email: params.payIdDetails.payId,
      address: this.params.payIdDetails.payId,
      // address: getAddressFromPayId(params.payIdDetails, {
      //   coin: 'BTC',
      //   network: 'testnet'
      // }),
      verified: true,
      tag: ''
    });
    const sheet = this.actionSheetProvider.createInfoSheet(
      'pay-id-added-to-contacts',
      { payIdDetails: this.params.payIdDetails }
    );
    sheet.present();
    sheet.onDidDismiss(() =>
      this.incomingDataProvider.finishIncomingData(this.params)
    );
  }
}

function chunkify(inputArray: string[], perChunk: number): string[][] {
  return inputArray.reduce((all, one, i) => {
    const ch = Math.floor(i / perChunk);
    all[ch] = [].concat(all[ch] || [], one);
    return all;
  }, []);
}
