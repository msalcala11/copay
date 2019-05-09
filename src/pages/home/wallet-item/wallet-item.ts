import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild
} from '@angular/core';
import { Item, ItemSliding } from 'ionic-angular';

export type WalletItemAction = 'send' | 'receive';

// {{
//   wallet.cachedStatus && wallet.cachedStatus.totalBalanceStr
//     ? wallet.cachedStatus.totalBalanceStr
//     : wallet.lastKnownBalance
// }}

@Component({
  selector: 'wallet-item',
  template: `
    <ion-item-sliding #slidingItem>
      <button ion-item (click)="performAction('view')">
        <ion-avatar item-start> <img src="assets/img/bch.svg" /> </ion-avatar>
        <ion-label item-start>
          <div class="primary-text wallet-name">
            {{ wallet.name || 'Bitcoin Cash' }}
          </div>
          <ion-note item-start class="secondary-text"> 1/1 </ion-note>
        </ion-label>
        <ion-note item-end>
          <div class="primary-text">
            {{
              wallet.cachedStatus && totalBalanceStr
                ? totalBalanceStr
                : lastKnownBalance
            }}
          </div>
          <div class="secondary-text">
            {{ wallet?.cachedStatus?.totalBalanceAlternative }}
            {{ wallet?.cachedStatus?.alternativeIsoCode }}
          </div>
        </ion-note>
      </button>
      <ion-item-options side="left">
        <button
          class="action action--send"
          ion-button
          (click)="performAction('archive')"
        >
          <div class="action__icon"><img src="assets/img/send.svg" /></div>
          <div class="action__text">Send</div>
        </button>
      </ion-item-options>
      <ion-item-options side="right">
        <button
          class="action action--receive"
          ion-button
          (click)="performAction('archive')"
        >
          <div class="action__icon"><img src="assets/img/receive.svg" /></div>
          <div class="action__text">Receive</div>
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

  @ViewChild(Item)
  item: Item;

  @ViewChild(ItemSliding)
  slidingItem: ItemSliding;

  currency: string;
  lastKnownBalance: string;
  totalBalanceStr: string;

  async ngAfterViewInit() {
    this.currency = 'BCH';
    this.lastKnownBalance = this.wallet.lastKnownBalance.replace(
      ` ${this.currency}`,
      ''
    );
    this.totalBalanceStr = this.wallet.cachedStatus.totalBalanceStr.replace(
      ` ${this.currency}`,
      ''
    );
  }

  performAction(action: WalletItemAction) {
    this.action.emit({
      walletId: this.wallet.id,
      action
    });
    this.slidingItem.close();
  }
}
