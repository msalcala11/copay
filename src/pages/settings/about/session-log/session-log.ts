import { Component, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import {
  ActionSheetController,
  ModalController,
  ToastController
} from 'ionic-angular';

// native
import { SocialSharing } from '@ionic-native/social-sharing';

// components
import { CustomModalComponent } from '../../../../components/custom-modal/custom-modal';

// providers
import { ConfigProvider } from '../../../../providers/config/config';
import { Logger } from '../../../../providers/logger/logger';
import { PlatformProvider } from '../../../../providers/platform/platform';

import * as _ from 'lodash';

@Component({
  selector: 'page-session-log',
  templateUrl: 'session-log.html'
})
export class SessionLogPage {
  private config: any;
  private dom: Document;

  public logOptions: any;
  public filteredLogs: any[];
  public filterValue: number;
  public isCordova: boolean;

  constructor(
    @Inject(DOCUMENT) dom: Document,
    private configProvider: ConfigProvider,
    private logger: Logger,
    private socialSharing: SocialSharing,
    private actionSheetCtrl: ActionSheetController,
    private toastCtrl: ToastController,
    private platformProvider: PlatformProvider,
    private translate: TranslateService,
    private modalCtrl: ModalController
  ) {
    this.dom = dom;
    this.config = this.configProvider.get();
    this.isCordova = this.platformProvider.isCordova;
    let logLevels: any = this.logger.getLevels();
    this.logOptions = _.keyBy(logLevels, 'weight');
  }

  ionViewDidLoad() {
    this.logger.info('ionViewDidLoad SessionLogPage');
  }

  ionViewWillEnter() {
    let selectedLevel: any = _.has(this.config, 'log.weight')
      ? this.logger.getWeight(this.config.log.weight)
      : this.logger.getDefaultWeight();
    this.filterValue = selectedLevel.weight;
    this.setOptionSelected(selectedLevel.weight);
    this.filterLogs(selectedLevel.weight);
  }

  private filterLogs(weight: number): void {
    this.filteredLogs = this.logger.get(weight);
  }

  public setOptionSelected(weight: number): void {
    this.filterLogs(weight);
    let opts = {
      log: {
        weight
      }
    };
    this.configProvider.set(opts);
  }

  public prepareLogs(): any {
    let log =
      'Copay Session Logs\n Be careful, this could contain sensitive private data\n\n';
    log += '\n\n';
    log += this.logger
      .get()
      .map(v => {
        return '[' + v.timestamp + '][' + v.level + ']' + v.msg;
      })
      .join('\n');

    return log;
  }

  private copyToClipboard() {
    let textarea = this.dom.createElement('textarea');
    this.dom.body.appendChild(textarea);
    textarea.value = this.prepareLogs();
    textarea.select();
    this.dom.execCommand('copy');
    let message = this.translate.instant('Copied to clipboard');
    let showSuccess = this.toastCtrl.create({
      message,
      duration: 1000
    });
    showSuccess.present();
  }

  private sendLogs(): void {
    let body = this.prepareLogs();

    this.socialSharing.shareViaEmail(
      body,
      'Copay Logs',
      null, // TO: must be null or an array
      null, // CC: must be null or an array
      null, // BCC: must be null or an array
      null // FILES: can be null, a string, or an array
    );
  }

  public showOptionsMenu(): void {
    let copyText = this.translate.instant('Copy to clipboard');
    let emailText = this.translate.instant('Send by email');
    let button = [];

    if (this.isCordova) {
      button = [
        {
          text: emailText,
          handler: () => {
            this.showWarningModal();
          }
        }
      ];
    } else {
      button = [
        {
          text: copyText,
          handler: () => {
            this.showWarningModal();
          }
        }
      ];
    }

    let actionSheet = this.actionSheetCtrl.create({
      title: '',
      buttons: button
    });
    actionSheet.present();
  }

  private showWarningModal() {
    let sessionLogWarningModal = this.modalCtrl.create(
      CustomModalComponent,
      {
        modalClass: 'warning',
        imgPath: 'assets/img/icon-warning.svg',
        title: 'Sensitive Data',
        htmlMessage:
          '<span>The information you are about to share/export may contain sensitive data such us wallet IDs, addresses, balances, etc.</span></br>' +
          '<span>Although this is not critical, please be careful and make sure you trust the person or entity you are sharing this information with.</span>',
        firstButton: {
          text: 'I understand',
          color: 'warning',
          data: ''
        }
      },
      { showBackdrop: false, enableBackdropDismiss: false }
    );
    sessionLogWarningModal.present();
    sessionLogWarningModal.onDidDismiss(() => {
      this.isCordova ? this.sendLogs() : this.copyToClipboard();
    });
  }
}
