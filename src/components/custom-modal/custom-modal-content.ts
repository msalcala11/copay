import {
  Component,
  ContentChild,
  ElementRef,
  Input,
  Renderer,
  ViewChild
} from '@angular/core';
import { Subject } from 'rxjs/Subject';

@Component({
  selector: 'modal-cancel-text',
  template: `<ng-content></ng-content>`
})
export class ModalCancelText {}

@Component({
  selector: 'custom-modal-content',
  templateUrl: 'custom-modal-content.html'
})
export class CustomModalContent {
  @Input() type: 'danger' | 'warning' | 'success' = 'warning';
  @ContentChild(ModalCancelText) modalCancelText: ModalCancelText;
  @ViewChild('imageContainer') imageContainer: ElementRef;

  private actionSubject = new Subject<boolean>();
  public action = this.actionSubject.asObservable();

  constructor(private renderer: Renderer) {}

  ngAfterViewInit() {
    this.renderer.setElementClass(
      this.imageContainer.nativeElement,
      this.getImageBackgroundClass(this.type),
      true
    );
  }

  getImageBackgroundClass(type: string): string {
    return `background-color-${type}`;
  }

  close(confirm: boolean): void {
    this.actionSubject.next(confirm);
  }
}
