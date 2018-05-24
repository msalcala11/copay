import {
  Component,
  ContentChild,
  ElementRef,
  Input,
  Renderer,
  ViewChild
} from '@angular/core';
import { Subject } from 'rxjs/Subject';
import { CustomModalButtonCancel, CustomModalIcon } from './custom-modal-tags';

@Component({
  selector: 'custom-modal-content',
  templateUrl: 'custom-modal-content.html'
})
export class CustomModalContent {
  @Input() type: 'danger' | 'warning' | 'success' = 'warning';
  @ContentChild(CustomModalButtonCancel)
  cancelButtonText: CustomModalButtonCancel;
  @ContentChild(CustomModalIcon) customIcon: CustomModalIcon;
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
