import {
  Component,
  ContentChild,
  ElementRef,
  Input,
  Renderer,
  ViewChild
} from '@angular/core';
import { NavParams, ViewController } from 'ionic-angular';
import { Subject } from 'rxjs/Subject';
import { CustomModalContent, ModalCancelText } from './custom-modal-content';

@Component({
  selector: 'custom-modal',
  templateUrl: 'custom-modal.html'
})
export class CustomModalComponent {
  modal: string;

  @ViewChild(CustomModalContent) modalContent: CustomModalContent;

  constructor(private viewCtrl: ViewController, private navParams: NavParams) {
    this.modal = this.navParams.get('modal');
  }

  ngAfterViewInit() {
    this.modalContent.action.subscribe(confirm => {
      this.close(confirm);
    });
  }

  public close(confirm: boolean): void {
    this.viewCtrl.dismiss(confirm, null, { animate: false });
  }
}

export const CUSTOM_MODAL_COMPONENTS = [
  CustomModalComponent,
  CustomModalContent,
  ModalCancelText
];
