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

// <img
// src="assets/img/currencies/{{wallet.network === 'testnet' ? 'testnet/' : ''}}{{wallet.coin}}.svg"
// />

@Component({
  selector: 'wallet-item',
  template: `
    <ion-item-sliding #slidingItem>
      <button ion-item (click)="performAction('view')">
        <ion-avatar item-start>
          <img
            [ngClass]="{ testnet: wallet.network === 'testnet' }"
            src="assets/img/currencies/{{wallet.coin}}.svg"
          />
        </ion-avatar>
        <ion-label item-start>
          <div class="primary-text wallet-name">
            {{ wallet.name || 'Bitcoin Cash' }}
          </div>
          <ion-note item-start class="secondary-text">
            {{ wallet.credentials.m }}/{{ wallet.credentials.n }}
          </ion-note>
        </ion-label>
        <ion-note item-end *ngIf="!hasZeroBalance">
          <div class="primary-text">
            {{
              wallet.cachedStatus && totalBalanceStr
                ? totalBalanceStr
                : lastKnownBalance
            }}
          </div>
          <div class="secondary-text" *ngIf="wallet.cachedStatus">
            {{ wallet?.cachedStatus.totalBalanceAlternative }}
            {{ wallet?.cachedStatus.alternativeIsoCode }}
          </div>
        </ion-note>
        <ion-note item-end *ngIf="hasZeroBalance">
          <div class="primary-text">0</div>
          <div class="secondary-text" *ngIf="wallet.cachedStatus">
            0 {{ wallet?.cachedStatus.alternativeIsoCode }}
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
  hasZeroBalance: boolean;
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
    if (!this.wallet.cachedStatus) return;
    this.totalBalanceStr =
      this.wallet.cachedStatus.totalBalanceStr &&
      this.wallet.cachedStatus.totalBalanceStr.replace(` ${this.currency}`, '');
    this.hasZeroBalance =
      this.wallet.cachedStatus.totalBalanceSat === 0 ||
      this.lastKnownBalance === '0.00';
  }

  performAction(action: WalletItemAction) {
    this.action.emit({
      wallet: this.wallet,
      action
    });
    this.slidingItem.close();
  }
}
