import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NavController } from 'ionic-angular';
import { ActionSheetProvider } from '../../../providers';
import { ReceivingWalletsPage } from '../receiving-wallets/receiving-wallets';

@Component({
  selector: 'page-create-pay-id',
  templateUrl: 'create-pay-id.html'
})
export class CreatePayIdPage {
  public createForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private nav: NavController,
    private actionSheetProvider: ActionSheetProvider
  ) {
    this.createForm = this.fb.group({
      payId: ['', Validators.required]
    });
  }

  createPayId() {
    console.log('create payId called');
    this.nav.push(ReceivingWalletsPage);
  }

  showTakenActionSheet() {
    this.actionSheetProvider
      .createInfoSheet('pay-id-taken', { payId: this.createForm.value.payId })
      .present();
  }
}
