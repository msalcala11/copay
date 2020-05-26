import { Component } from '@angular/core';

@Component({
  selector: 'merchant-cell',
  template: `
    <img
      class="merchant-cell__avatar"
      src="https://marty.bp:8088/gift-cards/assets/amazoncom/icon2.svg"
    />
    <div class="merchant-cell__block">
      <div class="merchant-cell__title">Amazon</div>
      <div class="merchant-cell__caption">
        <div *ngIf="true">$1-$2,000</div>
        <div *ngIf="false">3% Off Each Purchase</div>
      </div>
    </div>
  `
})
export class MerchantCell {}
