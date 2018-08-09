import { Component } from '@angular/core';
import { ExternalLinkProvider } from '../../../../providers/external-link/external-link';

@Component({
  selector: 'card-terms',
  templateUrl: 'card-terms.html'
})
export class CardTermsComponent {
  cardName: string = 'Amazon';

  constructor(private externalLinkProvider: ExternalLinkProvider) {}

  openExternalLink(url: string): void {
    this.externalLinkProvider.open(url);
  }
}
