import { Component, Input } from '@angular/core';
import { ExternalLinkProvider } from '../../../../providers/external-link/external-link';

@Component({
  selector: 'card-terms',
  templateUrl: 'card-terms.html'
})
export class CardTermsComponent {
  @Input()
  cardName: string;

  constructor(private externalLinkProvider: ExternalLinkProvider) {}

  openExternalLink(url: string): void {
    this.externalLinkProvider.open(url);
  }
}
