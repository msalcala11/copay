import { Component } from '@angular/core';
import { PlatformProvider } from '../../../../providers/platform/platform';

@Component({
  templateUrl: 'purchased-cards.html'
})
export class PurchasedCardsPage {
  platformName: 'ios' | 'md' = 'md';
  constructor(public platformProvider: PlatformProvider) {}

  ngOnInit() {
    this.platformName = this.platformProvider.isIOS ? 'ios' : 'md';
  }
}
