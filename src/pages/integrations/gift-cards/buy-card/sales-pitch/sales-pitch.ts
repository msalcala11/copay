import { Component, Input } from '@angular/core';

@Component({
  selector: 'sales-pitch',
  templateUrl: 'sales-pitch.html'
})
export class SalesPitchComponent {
  @Input() cardName: string;
}
