import { Component, ContentChild, Input } from '@angular/core';
import { NavParams, ViewController } from 'ionic-angular';

@Component({
  selector: 'custom-modal-icon',
  template: `<ng-content></ng-content>`
})
export class CustomModalIcon {}

@Component({
  selector: 'custom-modal-heading',
  template: `<ng-content></ng-content>`
})
export class CustomModalHeading {}

@Component({
  selector: 'custom-modal-message',
  template: `<ng-content></ng-content>`
})
export class CustomModalMessage {}

@Component({
  selector: 'custom-modal-button-confirm',
  template: `<ng-content></ng-content>`
})
export class CustomModalButtonConfirm {}

@Component({
  selector: 'custom-modal-button-cancel',
  template: `<ng-content></ng-content>`
})
export class CustomModalButtonCancel {}

@Component({
  selector: 'custom-modal-content',
  templateUrl: 'custom-modal-content.html'
})
export class CustomModalContent {
  @Input() type: string = 'warning';
  @ContentChild(CustomModalButtonCancel)
  cancelButtonText: CustomModalButtonCancel;
  @ContentChild(CustomModalIcon) customIcon: CustomModalIcon;
}

@Component({
  selector: 'custom-modal',
  templateUrl: 'custom-modal.html'
})
export class CustomModalComponent {
  modal: string;

  constructor(private viewCtrl: ViewController, private navParams: NavParams) {
    this.modal = this.navParams.get('modal');
  }

  public close(data): void {
    this.viewCtrl.dismiss(data, null, { animate: false });
  }
}

// export const CUSTOM_MODAL_COMPONENTS = [
//   CustomModalComponent,
//   CustomModalContent,
//   CustomModalIcon,
//   CustomModalHeading,
//   CustomModalMessage,
//   CustomModalButtonConfirm,
//   CustomModalButtonCancel
// ];
