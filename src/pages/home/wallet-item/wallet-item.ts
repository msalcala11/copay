import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild
} from '@angular/core';
import { Item, ItemSliding } from 'ionic-angular';
import * as _ from 'lodash';

export type WalletItemAction = 'send' | 'receive';

@Component({
  selector: 'wallet-item',
  template: `
    <ion-item-sliding #slidingItem>
      <button ion-item (click)="performAction('view')">
        <img src="" />
        <ion-note item-start> Bitcoin Cash </ion-note>
        <ion-note item-end> .012345 </ion-note>
      </button>
      <ion-item-options side="left">
        <button ion-button (click)="performAction('archive')" color="info">
          <div class="archive__icon">
            <ion-icon ios="md-close" md="md-close"></ion-icon>
          </div>
          <div class="archive__text">Send</div>
        </button>
      </ion-item-options>
      <ion-item-options side="right">
        <button ion-button (click)="performAction('archive')" color="success">
          <div class="archive__icon">
            <ion-icon ios="md-close" md="md-close"></ion-icon>
          </div>
          <div class="archive__text">Receive</div>
        </button>
      </ion-item-options>
    </ion-item-sliding>
  `
})
export class WalletItem {
  @Input()
  wallet: any = { id: 'adfjk' };

  @Output()
  action: EventEmitter<{
    walletId: string;
    action: WalletItemAction;
  }> = new EventEmitter();

  currency: string;
  numCurrencies: number;
  totalBalance: number;

  @ViewChild(Item)
  item: Item;

  @ViewChild(ItemSliding)
  slidingItem: ItemSliding;

  async ngAfterViewInit() {
    this.currency = 'BCH';
  }

  performAction(action: WalletItemAction) {
    this.action.emit({
      walletId: this.wallet.id,
      action
    });
    // this.slidingItem.close();
  }
}
