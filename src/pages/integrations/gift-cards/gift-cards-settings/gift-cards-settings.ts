import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import * as _ from 'lodash';

import {
  ConfigProvider,
  GiftCardProvider,
  HomeIntegrationsProvider
} from '../../../../providers';
import { GiftCard } from '../../../../providers/gift-card/gift-card.types';
import { GiftCardSettingsPage } from '../gift-card-settings/gift-card-settings';

@Component({
  selector: 'gift-cards-settings-page',
  templateUrl: 'gift-cards-settings.html'
})
export class GiftCardsSettingsPage {
  purchasedBrands: GiftCard[][];
  showAtHome: boolean;

  constructor(
    private configProvider: ConfigProvider,
    private giftCardProvider: GiftCardProvider,
    private homeIntegrationsProvider: HomeIntegrationsProvider,
    private nav: NavController
  ) {}

  async ngOnInit() {
    this.showAtHome = this.homeIntegrationsProvider.shouldShowInHome(
      'giftcards'
    );
    const purchasedGiftCards = await this.giftCardProvider.getPurchasedCards();
    console.log('purchasedGiftCards', purchasedGiftCards);
    const purchasedCards = await this.giftCardProvider.getPurchasedBrands();
    const allPurchasedBrands = _.uniqBy(
      purchasedCards,
      ([cards]) => cards.displayName
    );
    this.purchasedBrands = allPurchasedBrands.slice(0, 20);
    setTimeout(() => (this.purchasedBrands = allPurchasedBrands), 1000);
  }

  goToCardSettings(cardName: string) {
    this.nav.push(GiftCardSettingsPage, { cardName });
  }

  public integrationChange(): void {
    this.homeIntegrationsProvider.updateConfig('giftcards', this.showAtHome);
    this.configProvider.set({
      showIntegration: { giftcards: this.showAtHome }
    });
  }
}
