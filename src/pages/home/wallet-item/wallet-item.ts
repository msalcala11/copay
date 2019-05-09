import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';
import { Item, ItemSliding } from 'ionic-angular';

export type WalletItemAction = 'send' | 'receive';

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
          <ion-note item-start class="secondary-text">
            {{ wallet.credentials.m }}/{{ wallet.credentials.n }}
          </ion-note>
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
          (click)="performAction('send')"
        >
          <div class="action__icon"><img src="assets/img/send.svg" /></div>
          <div class="action__text">Send</div>
        </button>
      </ion-item-options>
      <ion-item-options side="right">
        <button
          class="action action--receive"
          ion-button
          (click)="performAction('receive')"
        >
          <div class="action__icon"><img src="assets/img/receive.svg" /></div>
          <div class="action__text">Receive</div>
        </button>
      </ion-item-options>
    </ion-item-sliding>
  `
})
export class WalletItem implements OnInit, OnChanges {
  @Input()
  wallet: any = { id: 'adfjk' };

  @Output()
  action: EventEmitter<{
    wallet: any;
    action: WalletItemAction;
  }> = new EventEmitter();

  @ViewChild(Item)
  item: Item;

  @ViewChild(ItemSliding)
  slidingItem: ItemSliding;

  currency: string;
  lastKnownBalance: string;
  totalBalanceStr: string;

  ngOnInit() {
    this.recalculateValues();
  }

  ngOnChanges() {
    this.recalculateValues();
  }

  recalculateValues() {
    this.currency = this.wallet.coin.toUpperCase();
    this.lastKnownBalance =
      this.wallet.lastKnownBalance &&
      this.wallet.lastKnownBalance.replace(` ${this.currency}`, '');
    this.totalBalanceStr =
      this.wallet.cachedStatus &&
      this.wallet.cachedStatus.totalBalanceStr &&
      this.wallet.cachedStatus.totalBalanceStr.replace(` ${this.currency}`, '');
  }

  performAction(action: WalletItemAction) {
    this.action.emit({
      wallet: this.wallet,
      action
    });
    this.slidingItem.close();
  }
}
