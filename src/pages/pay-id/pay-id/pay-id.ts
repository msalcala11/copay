import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { VerifyPayIdPage } from '../verify/verify';

@Component({
  selector: 'page-pay-id',
  templateUrl: 'pay-id.html'
})
export class PayIdPage {
  constructor(private nav: NavController) {}

  showVerifyCode() {
    this.nav.push(VerifyPayIdPage);
  }
}
