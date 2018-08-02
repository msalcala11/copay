import { Component, Input } from '@angular/core';

@Component({
  selector: 'card-list-item',
  template: `
  <button ion-item>
    <ion-icon item-start>
      <img class="cards-list__icon amazon" src="assets/img/amazon/amazon-icon.svg">
    </ion-icon>
    <ion-label>
      <div class="cards-list__label">{{card.amount | formatCurrency:card.currency}}</div>
      <ion-note class="cards-list__note">{{card.date | amTimeAgo}}</ion-note>
    </ion-label>
  </button>
  `
})
export class CardListItemComponent {
  @Input() card;
}
