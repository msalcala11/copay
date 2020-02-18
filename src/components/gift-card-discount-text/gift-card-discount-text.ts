import { Component, Input } from '@angular/core';
import {
  CardConfig,
  GiftCardDiscount
} from '../../providers/gift-card/gift-card.types';

@Component({
  selector: 'gift-card-discount-text',
  template: `
    <span *ngIf="discount.type === 'flatrate'">{{
      discount.amount | formatCurrency: cardConfig.currency:'minimal'
    }}</span>
    <span *ngIf="discount.type === 'percentage'">
      <span *ngIf="showConcisePercentage">{{ concisePercentage }}%</span>
      <span *ngIf="!showConcisePercentage">{{ discount.amount }}%</span>
    </span>
  `
})
export class GiftCardDiscountText {
  @Input()
  discount: GiftCardDiscount;

  @Input()
  cardConfig: CardConfig;

  @Input()
  showConcisePercentage: boolean = false;

  concisePercentage: number;

  ngOnInit() {
    this.concisePercentage = Math.floor(this.discount.amount);
    // if (this.cardConfig.brand === 'DoorDash') {
    //   console.log('doordash discount.amount', this.discount.amount);
    //   console.log('this.concisePercentage', this.concisePercentage);
    // }
  }

  constructor() {}
}
