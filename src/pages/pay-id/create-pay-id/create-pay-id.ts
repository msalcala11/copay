import { Component, NgZone } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NavController } from 'ionic-angular';
import { InfoSheetComponent } from '../../../components/info-sheet/info-sheet';
import { ActionSheetProvider } from '../../../providers';
import { ReceivingWalletsPage } from '../receiving-wallets/receiving-wallets';

@Component({
  selector: 'page-create-pay-id',
  templateUrl: 'create-pay-id.html'
})
export class CreatePayIdPage {
  public createForm: FormGroup;
  public hasError: boolean = false;
  public infoSheet: InfoSheetComponent;

  constructor(
    private fb: FormBuilder,
    private nav: NavController,
    private actionSheetProvider: ActionSheetProvider,
    private zone: NgZone
  ) {
    this.createForm = this.fb.group({
      payId: ['', Validators.required]
    });
  }

  createPayId() {
    this.isTaken()
      ? this.showTakenActionSheet()
      : this.nav.push(ReceivingWalletsPage);
  }

  isTaken() {
    return this.createForm.value.payId === 'taken-test';
  }

  onChange() {
    this.zone.run(() => {
      this.hasError = false;
      this.infoSheet && this.infoSheet.dismiss();
      this.createForm.controls.payId.setValue(
        this.createForm.value.payId.replace(/[^a-z0-9]/gi, '')
      );
    });
  }

  showTakenActionSheet() {
    this.hasError = true;
    this.infoSheet = this.actionSheetProvider.createInfoSheet('pay-id-taken', {
      payId: this.createForm.value.payId
    });
    this.infoSheet.present();
  }
}
