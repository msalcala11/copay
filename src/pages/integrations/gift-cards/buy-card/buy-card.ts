import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';

@Component({
  selector: 'card-details-page',
  templateUrl: 'card-details.html'
})
export class BuyCardPage {
  constructor(private nav: NavController) {}

  cancel() {
    this.nav.pop();
  }
}
