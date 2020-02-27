import { ChangeDetectorRef, Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ModalController, NavController } from 'ionic-angular';
import { Logger } from '../../providers/logger/logger';

import * as _ from 'lodash';

// providers
import { Observable } from 'rxjs';
// pages
import { InAppBrowserRef } from '../../models/in-app-browser/in-app-browser-ref.model';
import { User } from '../../models/user/user.model';
import {
  BitPayIdProvider,
  IABCardProvider,
  InAppBrowserProvider
} from '../../providers';
import { AnalyticsProvider } from '../../providers/analytics/analytics';
import { AppProvider } from '../../providers/app/app';
import { BitPayCardProvider } from '../../providers/bitpay-card/bitpay-card';
import { ConfigProvider } from '../../providers/config/config';
import { ExternalLinkProvider } from '../../providers/external-link/external-link';
import { HomeIntegrationsProvider } from '../../providers/home-integrations/home-integrations';
import { LanguageProvider } from '../../providers/language/language';
import {
  Network,
  PersistenceProvider
} from '../../providers/persistence/persistence';
import { PlatformProvider } from '../../providers/platform/platform';
import { ProfileProvider } from '../../providers/profile/profile';
import { TouchIdProvider } from '../../providers/touchid/touchid';

// pages
import { AddPage } from '../add/add';
import { BitPaySettingsPage } from '../integrations/bitpay-card/bitpay-settings/bitpay-settings';
import { CoinbaseSettingsPage } from '../integrations/coinbase/coinbase-settings/coinbase-settings';
import { GiftCardsSettingsPage } from '../integrations/gift-cards/gift-cards-settings/gift-cards-settings';
import { ShapeshiftSettingsPage } from '../integrations/shapeshift/shapeshift-settings/shapeshift-settings';
import { SimplexSettingsPage } from '../integrations/simplex/simplex-settings/simplex-settings';
import { PinModalPage } from '../pin/pin-modal/pin-modal';
import { AboutPage } from './about/about';
import { AddressbookPage } from './addressbook/addressbook';
import { AdvancedPage } from './advanced/advanced';
import { AltCurrencyPage } from './alt-currency/alt-currency';
import { BitPayIdPage } from './bitpay-id/bitpay-id';
import { FeePolicyPage } from './fee-policy/fee-policy';
import { KeySettingsPage } from './key-settings/key-settings';
import { LanguagePage } from './language/language';
import { LockPage } from './lock/lock';
import { NotificationsPage } from './notifications/notifications';
import { SharePage } from './share/share';
import { WalletSettingsPage } from './wallet-settings/wallet-settings';

@Component({
  selector: 'page-settings',
  templateUrl: 'settings.html'
})
export class SettingsPage {
  public appName: string;
  public currentLanguageName: string;
  public languages;
  public config;
  public selectedAlternative;
  public isCordova: boolean;
  public lockMethod: string;
  public integrationServices = [];
  public cardServices = [];
  public bitpayCardItems = [];
  public showBitPayCard: boolean = false;
  public encryptEnabled: boolean;
  public touchIdAvailable: boolean;
  public touchIdEnabled: boolean;
  public touchIdPrevValue: boolean;
  public walletsGroups: any[];
  public cardExperimentEnabled: boolean;
  public bitPayIdUserInfo: any;
  private cardIAB_Ref: InAppBrowserRef;
  private network = Network[this.bitPayIdProvider.getEnvironment().network];
  private user$: Observable<User>;
  public showBalance: boolean;

  constructor(
    private navCtrl: NavController,
    private app: AppProvider,
    private language: LanguageProvider,
    private externalLinkProvider: ExternalLinkProvider,
    private profileProvider: ProfileProvider,
    private configProvider: ConfigProvider,
    private logger: Logger,
    private homeIntegrationsProvider: HomeIntegrationsProvider,
    private bitPayCardProvider: BitPayCardProvider,
    private platformProvider: PlatformProvider,
    private translate: TranslateService,
    private modalCtrl: ModalController,
    private touchid: TouchIdProvider,
    private analyticsProvider: AnalyticsProvider,
    private persistanceProvider: PersistenceProvider,
    private iab: InAppBrowserProvider,
    private bitPayIdProvider: BitPayIdProvider,
    private changeRef: ChangeDetectorRef,
    private iabCardProvider: IABCardProvider
  ) {
    this.appName = this.app.info.nameCase;
    this.isCordova = this.platformProvider.isCordova;
    this.user$ = this.iabCardProvider.user$;
  }

  ionViewDidLoad() {
    this.logger.info('Loaded: SettingsPage');
  }

  ionViewWillEnter() {
    this.persistanceProvider
      .getCardExperimentFlag()
      .then(res => (this.cardExperimentEnabled = res === 'enabled'));

    this.cardIAB_Ref = this.iab.refs.card;

    if (this.cardIAB_Ref) {
      // check for user info
      this.persistanceProvider
        .getBitPayIdUserInfo(this.network)
        .then((user: User) => {
          this.bitPayIdUserInfo = user;
        });

      this.user$.subscribe(user => {
        if (user) {
          this.bitPayIdUserInfo = user;
          this.bitPayCardProvider.get({ noHistory: true }).then(cards => {
            this.showBitPayCard = !!this.app.info._enabledExtensions.debitcard;
            this.bitpayCardItems = cards;
          });
          this.changeRef.detectChanges();
        }
      });
    }

    this.currentLanguageName = this.language.getName(
      this.language.getCurrent()
    );

    this.setShowBalanceFlag();

    const opts = {
      showHidden: true
    };
    const wallets = this.profileProvider.getWallets(opts);
    this.walletsGroups = _.values(_.groupBy(wallets, 'keyId'));
    this.config = this.configProvider.get();
    this.selectedAlternative = {
      name: this.config.wallet.settings.alternativeName,
      isoCode: this.config.wallet.settings.alternativeIsoCode
    };
    this.lockMethod =
      this.config && this.config.lock && this.config.lock.method
        ? this.config.lock.method.toLowerCase()
        : null;
  }

  ionViewDidEnter() {
    // Show integrations
    const integrations = this.homeIntegrationsProvider.get();

    // Hide BitPay if linked
    setTimeout(() => {
      this.integrationServices = _.remove(_.clone(integrations), x => {
        if (x.type == 'card') return false;
        else return x;
      });
      this.cardServices = _.remove(_.clone(integrations), x => {
        if ((x.name == 'debitcard' && x.linked) || x.type == 'exchange')
          return false;
        else return x;
      });
    }, 200);

    // Only BitPay Wallet
    this.bitPayCardProvider.get({ noHistory: true }).then(cards => {
      this.showBitPayCard = !!this.app.info._enabledExtensions.debitcard;
      this.bitpayCardItems = cards;
    });
  }

  public openBitPayIdPage(): void {
    if (this.bitPayIdUserInfo) {
      this.navCtrl.push(BitPayIdPage, this.bitPayIdUserInfo);
    } else {
      this.cardIAB_Ref.executeScript(
        {
          code: `window.postMessage(${JSON.stringify({
            message: 'pairingOnly'
          })}, '*')`
        },
        () => {
          setTimeout(() => {
            this.cardIAB_Ref.show();
          }, 500);
        }
      );
    }
  }

  public openAltCurrencyPage(): void {
    this.navCtrl.push(AltCurrencyPage);
  }

  public openLanguagePage(): void {
    this.navCtrl.push(LanguagePage);
  }

  public openAdvancedPage(): void {
    this.navCtrl.push(AdvancedPage);
  }

  public openAboutPage(): void {
    this.navCtrl.push(AboutPage);
  }

  public openLockPage(): void {
    const config = this.configProvider.get();
    const lockMethod =
      config && config.lock && config.lock.method
        ? config.lock.method.toLowerCase()
        : null;
    if (!lockMethod || lockMethod == 'disabled') this.navCtrl.push(LockPage);
    if (lockMethod == 'pin') this.openPinModal('lockSetUp');
    if (lockMethod == 'fingerprint') this.checkFingerprint();
  }

  public openAddressBookPage(): void {
    this.navCtrl.push(AddressbookPage);
  }

  public openNotificationsPage(): void {
    this.navCtrl.push(NotificationsPage);
  }

  public openFeePolicyPage(): void {
    this.navCtrl.push(FeePolicyPage);
  }

  public openWalletSettingsPage(walletId: string): void {
    this.navCtrl.push(WalletSettingsPage, { walletId });
  }

  public openSharePage(): void {
    this.navCtrl.push(SharePage);
  }

  public openSettingIntegration(name: string): void {
    switch (name) {
      case 'coinbase':
        this.navCtrl.push(CoinbaseSettingsPage);
        break;
      case 'debitcard':
        this.navCtrl.push(BitPaySettingsPage);
        break;
      case 'shapeshift':
        this.navCtrl.push(ShapeshiftSettingsPage);
        break;
      case 'simplex':
        this.navCtrl.push(SimplexSettingsPage);
        break;
      case 'giftcards':
        this.navCtrl.push(GiftCardsSettingsPage);
        break;
    }
  }

  public openCardSettings(id): void {
    this.navCtrl.push(BitPaySettingsPage, { id });
  }

  public openGiftCardsSettings() {
    this.navCtrl.push(GiftCardsSettingsPage);
  }

  public openHelpExternalLink(): void {
    this.analyticsProvider.logEvent('help', {});
    const url =
      this.appName == 'Copay'
        ? 'https://github.com/bitpay/copay/issues'
        : 'https://help.bitpay.com/bitpay-app';
    const optIn = true;
    const title = null;
    const message = this.translate.instant(
      'Help and support information is available at the website.'
    );
    const okText = this.translate.instant('Open');
    const cancelText = this.translate.instant('Go Back');
    this.externalLinkProvider.open(
      url,
      optIn,
      title,
      message,
      okText,
      cancelText
    );
  }

  private openPinModal(action): void {
    const modal = this.modalCtrl.create(
      PinModalPage,
      { action },
      { cssClass: 'fullscreen-modal' }
    );
    modal.present();
    modal.onDidDismiss(cancelClicked => {
      if (!cancelClicked) this.navCtrl.push(LockPage);
    });
  }

  private checkFingerprint(): void {
    this.touchid.check().then(() => {
      this.navCtrl.push(LockPage);
    });
  }

  public openSupportEncryptPassword(): void {
    const url =
      'https://support.bitpay.com/hc/en-us/articles/360000244506-What-Does-a-Spending-Password-Do-';
    const optIn = true;
    const title = null;
    const message = this.translate.instant('Read more in our support page');
    const okText = this.translate.instant('Open');
    const cancelText = this.translate.instant('Go Back');
    this.externalLinkProvider.open(
      url,
      optIn,
      title,
      message,
      okText,
      cancelText
    );
  }

  public openWalletGroupSettings(keyId: string): void {
    this.navCtrl.push(KeySettingsPage, { keyId });
  }

  public goToAddView(): void {
    this.navCtrl.push(AddPage, {
      isZeroState: true
    });
  }

  private setShowBalanceFlag() {
    this.profileProvider
      .getShowTotalBalanceFlag()
      .then(isShown => {
        this.showBalance = isShown;
      })
      .catch(err => {
        this.logger.error(err);
      });
  }

  public toggleShowBalanceFlag(): void {
    this.profileProvider.setShowTotalBalanceFlag(this.showBalance);
  }
}
