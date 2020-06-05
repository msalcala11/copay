import { Component, Input } from '@angular/core';
import { GiftCardProvider } from '../../../../../providers/gift-card/gift-card';
import {
  CardConfig,
  GiftCard
} from '../../../../../providers/gift-card/gift-card.types';
import { Merchant } from '../../../../../providers/merchant/merchant';

@Component({
  selector: 'card-list-item',
  template: `
    <button ion-item class="card-list-item">
      <ion-icon item-start>
        <img-loader
          class="card-list-item__icon"
          [ngClass]="{ archived: card?.archived && type === 'purchased' }"
          [src]="merchant?.icon"
          [fallbackAsPlaceholder]="true"
          [fallbackUrl]="giftCardProvider.fallbackIcon"
        ></img-loader>
      </ion-icon>
      <ion-label>
        <div *ngIf="type === 'purchased'">
          <div class="card-list-item__label">
            {{ card.amount | formatCurrency: card.currency }}
          </div>
          <ion-note class="card-list-item__note">{{
            card.date | amTimeAgo
          }}</ion-note>
        </div>
        <div
          *ngIf="
            (type === 'catalog' || type === 'settings') &&
            (cardConfig || merchant)
          "
        >
          <div class="card-list-item__label ellipsis">
            {{ merchant ? merchant.displayName : cardConfig.displayName }}
          </div>
          <ion-note class="card-list-item__note ellipsis" *ngIf="!cardConfig">
            {{ merchant.caption }}
          </ion-note>
          <ion-note
            class="card-list-item__note"
            *ngIf="
              cardConfig && !cardConfig.supportedAmounts && type === 'catalog'
            "
          >
            {{ cardConfig.minAmount | formatCurrency: currency:0 }} —
            {{ cardConfig.maxAmount | formatCurrency: currency:0 }}
          </ion-note>
          <ion-note
            class="card-list-item__note ellipsis"
            *ngIf="
              cardConfig && cardConfig.supportedAmounts && type === 'catalog'
            "
          >
            <span
              *ngFor="
                let amount of cardConfig.supportedAmounts;
                let last = last
              "
            >
              {{ amount | formatCurrency: currency:'minimal'
              }}<span *ngIf="!last">,</span>
            </span>
          </ion-note>
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
  type: 'catalog' | 'purchased' | 'settings' = 'catalog';

  @Input()
  config: CardConfig;

  @Input()
  merchant: Merchant;

  currency: string;

  constructor(public giftCardProvider: GiftCardProvider) {}

  async ngOnInit() {
    this.cardConfig =
      this.config ||
      (this.merchant && this.merchant.giftCards[0]) ||
      (this.card &&
        (await this.giftCardProvider.getCardConfig(this.card.name)));
    this.currency =
      (this.card && this.card.currency) ||
      (this.cardConfig && this.cardConfig.currency);
  }
}
