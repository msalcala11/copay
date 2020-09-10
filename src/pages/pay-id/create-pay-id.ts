import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'page-create-pay-id',
  templateUrl: 'create-pay-id.html'
})
export class CreatePayIdPage {
  public createForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.createForm = this.fb.group({
      payId: ['', Validators.required]
    });
  }
}
