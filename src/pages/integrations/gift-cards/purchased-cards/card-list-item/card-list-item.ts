import { Component, Input } from '@angular/core';
import {
  CardConfig,
  GiftCard,
  GiftCardProvider
} from '../../../../../providers/gift-card/gift-card';

@Component({
  selector: 'card-list-item',
  template: `
  <button ion-item class="card-list-item">
    <ion-icon item-start>
      <img class="card-list-item__icon" [src]="cardConfig?.icon">
    </ion-icon>
    <ion-label>
      <div *ngIf="!catalogListing">
        <div class="card-list-item__label">{{card.amount | formatCurrency:card.currency}}</div>
        <ion-note class="card-list-item__note">{{card.date | amTimeAgo}}</ion-note>
      </div>
      <div *ngIf="catalogListing && cardConfig">
        <div class="card-list-item__label">{{cardConfig.brand}}</div>
        <ion-note class="card-list-item__note">{{cardConfig.minAmount | formatCurrency:cardConfig.currency:0}} — {{cardConfig.maxAmount | formatCurrency:cardConfig.currency:0}}</ion-note>
      </div>
    </ion-label>
  </button>
  `
})
export class CardListItemComponent {
  public cardConfig: CardConfig;

  @Input()
  card: GiftCard;

  @Input()
  catalogListing: boolean = false;

  constructor(private giftCardProvider: GiftCardProvider) {}

  async ngOnInit() {
    this.cardConfig = await this.giftCardProvider.getCardConfig(this.card.name);
  }
}
