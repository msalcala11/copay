import { Component } from '@angular/core';

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

export const CUSTOM_MODAL_TAGS = [
  CustomModalIcon,
  CustomModalHeading,
  CustomModalMessage,
  CustomModalButtonConfirm,
  CustomModalButtonCancel
];
