import { Component } from '@angular/core';
// import PayId from 'bitcore-payid';
import { NavController, NavParams } from 'ionic-angular';
import {
  ActionSheetProvider,
  AddressBookProvider,
  IncomingDataProvider
} from '../../../providers';

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
  params: any;

  constructor(
    private ab: AddressBookProvider,
    private incomingDataProvider: IncomingDataProvider,
    private actionSheetProvider: ActionSheetProvider,
    private nav: NavController,
    private navParams: NavParams
  ) {
    this.codeRows = chunkify(this.code, 4);
    this.params = this.navParams.get('incomingDataParams');
    // console.log('PayId', PayId);
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
    const saveParams = {
      name: this.params.payIdDetails.payId.split('$')[0],
      email: '',
      address: this.params.payIdDetails.payId,
      verified: true,
      tag: ''
    };
    await this.ab.add(saveParams).catch(() => this.ab.update(saveParams));
    const sheet = this.actionSheetProvider.createInfoSheet(
      'pay-id-added-to-contacts',
      { payIdDetails: this.params.payIdDetails }
    );
    sheet.present();
    sheet.onDidDismiss(() =>
      this.navParams.get('fromAddressBook')
        ? this.nav.popToRoot()
        : this.incomingDataProvider.finishIncomingData(
            this.navParams.get('incomingDataParams')
          )
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
