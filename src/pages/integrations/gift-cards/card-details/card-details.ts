import { Component } from '@angular/core';
import { NavParams } from 'ionic-angular';

export interface GiftCard {
  claimCode: string;
  amount: number;
  currency: string;
  date: number;
}

@Component({
  selector: 'card-details-page',
  templateUrl: 'card-details.html'
})
export class CardDetailsPage {
  public card: GiftCard;

  constructor(private navParams: NavParams) {}

  ngOnInit() {
    this.card = this.navParams.get('card');
  }

  redeem() {}

  openArchiveSheet() {}
}
