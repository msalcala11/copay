import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';

@Component({
  selector: 'buy-card-page',
  templateUrl: 'buy-card.html'
})
export class BuyCardPage {
  constructor(private nav: NavController) {}

  cancel() {
    this.nav.pop();
  }
}
