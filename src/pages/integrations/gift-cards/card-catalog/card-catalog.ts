import { Component, OnInit } from '@angular/core';
import { NavController } from 'ionic-angular';

import { BuyCardPage } from '../buy-card/buy-card';

import {
  CardConfig,
  GiftCardProvider
} from '../../../../providers/gift-card/gift-card';

@Component({
  selector: 'card-catalog-page',
  templateUrl: 'card-catalog.html'
})
export class CardCatalogPage implements OnInit {
  public visibleCards: CardConfig[];
  public allCards: CardConfig[];

  constructor(
    private giftCardProvider: GiftCardProvider,
    private navCtrl: NavController
  ) {}

  async ngOnInit() {
    this.allCards = await this.giftCardProvider.getSupportedCards();
    this.visibleCards = [...this.allCards];
  }

  onSearch(query: string) {
    this.visibleCards = this.allCards.filter(
      c => c.name.toLowerCase().indexOf(query.toLowerCase()) > -1
    );
  }

  buyCard(cardConfig: CardConfig) {
    this.navCtrl.push(BuyCardPage, { cardName: cardConfig.name });
  }
}
