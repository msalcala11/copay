import { Component, ComponentRef, ViewChild } from '@angular/core';
import { Observable } from 'rxjs';
import { ActionSheetComponent } from './action-sheet';

export class ActionSheetParent {
  public componentRef: ComponentRef<Component>;

  @ViewChild(ActionSheetComponent) actionSheet: ActionSheetComponent;

  public async present(): Promise<void> {
    this.actionSheet.showActionSheet = true;
    await Observable.timer(50).toPromise();
    this.actionSheet.showSlideEffect = true;
  }

  public async dismiss(): Promise<void> {
    await this.actionSheet.dismiss();
    // this.appRef.detachView(componentRef.hostView);
    this.componentRef.destroy();
  }
}
