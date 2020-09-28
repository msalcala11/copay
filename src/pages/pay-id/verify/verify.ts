import { Component } from '@angular/core';

@Component({
  selector: 'verify-pay-id-page',
  templateUrl: 'verify.html'
})
export class VerifyPayIdPage {
  code: string[] = [
    '23423',
    '59872',
    '39712',
    '00510',
    '23423',
    '59872',
    '39712',
    '00510',
    '23423',
    '59872',
    '39712',
    '00510'
  ];
  codeRows: string[][];
  constructor() {
    this.codeRows = chunkify(this.code, 4);
    console.log('codeRows', this.codeRows);
  }
}

function chunkify(inputArray: string[], perChunk: number): string[][] {
  return inputArray.reduce((all, one, i) => {
    const ch = Math.floor(i / perChunk);
    all[ch] = [].concat(all[ch] || [], one);
    return all;
  }, []);
}
