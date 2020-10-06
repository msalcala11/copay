import { Component } from '@angular/core';
import { NavParams } from 'ionic-angular';
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
  constructor(
    private ab: AddressBookProvider,
    private incomingDataProvider: IncomingDataProvider,
    private actionSheetProvider: ActionSheetProvider,
    private navParams: NavParams
  ) {
    this.codeRows = chunkify(this.code, 4);
    console.log('codeRows', this.codeRows);
  }

  public async next() {
    await this.saveToContacts();
  }

  private async saveToContacts() {
    const params = this.navParams.get('incomingDataParams') as {
      payIdDetails: PayIdDetails;
    };
    await this.ab.add({
      name: '',
      email: '',
      // email: params.payIdDetails.payId,
      address: params.payIdDetails.payId,
      // address: getAddressFromPayId(params.payIdDetails, {
      //   coin: 'BTC',
      //   network: 'testnet'
      // }),
      tag: ''
    });
    const sheet = this.actionSheetProvider.createInfoSheet(
      'pay-id-added-to-contacts',
      { payIdDetails: params.payIdDetails }
    );
    sheet.present();
    sheet.onDidDismiss(() =>
      this.incomingDataProvider.finishIncomingData(params)
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
