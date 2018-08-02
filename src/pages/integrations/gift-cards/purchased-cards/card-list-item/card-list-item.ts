import { Component, Input } from '@angular/core';

@Component({
  selector: 'card-list-item',
  template: `
  <button ion-item>
    <ion-icon item-start>
      <img class="card-list-item__icon amazon" src="assets/img/amazon/amazon-icon.svg">
    </ion-icon>
    <ion-label>
      <div class="card-list-item__label">{{card.amount | formatCurrency:card.currency}}</div>
      <ion-note class="card-list-item__note">{{card.date | amTimeAgo}}</ion-note>
    </ion-label>
  </button>
  `
})
export class CardListItemComponent {
  @Input() card;
}
