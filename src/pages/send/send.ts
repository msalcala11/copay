import { Component, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Events, NavController, NavParams } from 'ionic-angular';
import * as _ from 'lodash';
import { Observable } from 'rxjs/Observable';

// Providers
import { ActionSheetProvider } from '../../providers/action-sheet/action-sheet';
import { AddressProvider } from '../../providers/address/address';
import { AppProvider } from '../../providers/app/app';
import { BwcErrorProvider } from '../../providers/bwc-error/bwc-error';
import { Coin, CurrencyProvider } from '../../providers/currency/currency';
import { ErrorsProvider } from '../../providers/errors/errors';
import { IncomingDataProvider } from '../../providers/incoming-data/incoming-data';
import { Logger } from '../../providers/logger/logger';
import { OnGoingProcessProvider } from '../../providers/on-going-process/on-going-process';
import {
  fetchPayIdDetails,
  getAddressFromPayId,
  isPayId,
  PayIdDetails
} from '../../providers/pay-id/pay-id';
import { PayproProvider } from '../../providers/paypro/paypro';
import { ProfileProvider } from '../../providers/profile/profile';

// Pages
import { HttpClient } from '@angular/common/http';
import { InfoSheetComponent } from '../../components/info-sheet/info-sheet';
import { CopayersPage } from '../add/copayers/copayers';
import { ImportWalletPage } from '../add/import-wallet/import-wallet';
import { JoinWalletPage } from '../add/join-wallet/join-wallet';
import { BitPayCardIntroPage } from '../integrations/bitpay-card/bitpay-card-intro/bitpay-card-intro';
import { CoinbasePage } from '../integrations/coinbase/coinbase';
import { SelectInvoicePage } from '../integrations/invoice/select-invoice/select-invoice';
import { ShapeshiftPage } from '../integrations/shapeshift/shapeshift';
import { SimplexPage } from '../integrations/simplex/simplex';
import { PaperWalletPage } from '../paper-wallet/paper-wallet';
import { VerifyPayIdPage } from '../pay-id/verify/verify';
import { ScanPage } from '../scan/scan';
import { AmountPage } from '../send/amount/amount';
import { ConfirmPage } from '../send/confirm/confirm';
import { SelectInputsPage } from '../send/select-inputs/select-inputs';
import { AddressbookAddPage } from '../settings/addressbook/add/add';
import { WalletDetailsPage } from '../wallet-details/wallet-details';
import { MultiSendPage } from './multi-send/multi-send';

@Component({
  selector: 'page-send',
  templateUrl: 'send.html'
})
export class SendPage {
  public wallet: any;
  public search: string = '';
  public hasWallets: boolean;
  public invalidAddress: boolean;
  public invalidAddressErrorMessage: string;
  public verifyPayIdSheet: InfoSheetComponent;
  private validDataTypeMap: string[] = [
    'BitcoinAddress',
    'BitcoinCashAddress',
    'EthereumAddress',
    'EthereumUri',
    'RippleAddress',
    'RippleUri',
    'BitcoinUri',
    'BitcoinCashUri',
    'BitPayUri'
  ];
  private pageMap = {
    AddressbookAddPage,
    AmountPage,
    BitPayCardIntroPage,
    CoinbasePage,
    ConfirmPage,
    CopayersPage,
    ImportWalletPage,
    JoinWalletPage,
    PaperWalletPage,
    ShapeshiftPage,
    SimplexPage,
    SelectInvoicePage,
    WalletDetailsPage
  };

  constructor(
    private currencyProvider: CurrencyProvider,
    private http: HttpClient,
    private navCtrl: NavController,
    private navParams: NavParams,
    private payproProvider: PayproProvider,
    private profileProvider: ProfileProvider,
    private logger: Logger,
    private incomingDataProvider: IncomingDataProvider,
    private addressProvider: AddressProvider,
    private events: Events,
    private actionSheetProvider: ActionSheetProvider,
    private appProvider: AppProvider,
    private translate: TranslateService,
    private errorsProvider: ErrorsProvider,
    private onGoingProcessProvider: OnGoingProcessProvider,
    private bwcErrorProvider: BwcErrorProvider
  ) {
    this.wallet = this.navParams.data.wallet;
    this.events.subscribe('Local/AddressScan', this.updateAddressHandler);
    this.events.subscribe('SendPageRedir', this.SendPageRedirEventHandler);
  }

  @ViewChild('transferTo')
  transferTo;

  ionViewDidLoad() {
    this.logger.info('Loaded: SendPage');
  }

  ionViewWillEnter() {
    this.hasWallets = !_.isEmpty(
      this.profileProvider.getWallets({ coin: this.wallet.coin })
    );
  }

  ngOnDestroy() {
    this.events.unsubscribe('Local/AddressScan', this.updateAddressHandler);
    this.events.unsubscribe('SendPageRedir', this.SendPageRedirEventHandler);
  }

  private SendPageRedirEventHandler: any = nextView => {
    const currentIndex = this.navCtrl.getActive().index;
    const currentView = this.navCtrl.getViews();
    nextView.params.fromWalletDetails = true;
    nextView.params.walletId = this.wallet.credentials.walletId;
    this.navCtrl
      .push(this.pageMap[nextView.name], nextView.params, { animate: false })
      .then(() => {
        if (currentView[currentIndex].name == 'ScanPage')
          this.navCtrl.remove(currentIndex);
      });
  };

  private updateAddressHandler: any = data => {
    this.search = data.value;
    this.processInput();
  };

  public shouldShowZeroState() {
    return (
      this.wallet &&
      this.wallet.cachedStatus &&
      !this.wallet.cachedStatus.totalBalanceSat
    );
  }

  public openScanner(): void {
    this.navCtrl.push(ScanPage, { fromSend: true }, { animate: false });
  }

  public showOptions(coin: Coin) {
    return (
      this.currencyProvider.isMultiSend(coin) ||
      this.currencyProvider.isUtxoCoin(coin)
    );
  }

  private checkCoinAndNetwork(data, isPayPro?): boolean {
    let isValid, addrData;
    if (isPayPro) {
      isValid =
        data &&
        data.chain == this.currencyProvider.getChain(this.wallet.coin) &&
        data.network == this.wallet.network;
    } else {
      addrData = this.addressProvider.getCoinAndNetwork(
        data,
        this.wallet.network
      );
      isValid =
        this.currencyProvider.getChain(this.wallet.coin).toLowerCase() ==
          addrData.coin && addrData.network == this.wallet.network;
    }

    if (isValid) {
      this.clearInvalidAddressError();
      return true;
    } else {
      this.invalidAddress = true;
      let network = isPayPro ? data.network : addrData.network;

      if (this.wallet.coin === 'bch' && this.wallet.network === network) {
        const isLegacy = this.checkIfLegacy();
        isLegacy ? this.showLegacyAddrMessage() : this.showErrorMessage();
      } else {
        this.showErrorMessage();
      }
    }

    return false;
  }

  private redir(search?: string) {
    this.incomingDataProvider.redir(search || this.search, {
      activePage: 'SendPage',
      amount: this.navParams.data.amount,
      coin: this.navParams.data.coin // TODO ???? what is this for ?
    });
    this.search = '';
  }

  private showErrorMessage() {
    const msg = this.translate.instant(
      'The wallet you are using does not match the network and/or the currency of the address provided'
    );
    const title = this.translate.instant('Error');
    this.errorsProvider.showDefaultError(msg, title, () => {
      this.search = '';
    });
  }

  private showLegacyAddrMessage() {
    const appName = this.appProvider.info.nameCase;
    const infoSheet = this.actionSheetProvider.createInfoSheet(
      'legacy-address-info',
      { appName }
    );
    infoSheet.present();
    infoSheet.onDidDismiss(option => {
      if (option) {
        const legacyAddr = this.search;
        const cashAddr = this.addressProvider.translateToCashAddress(
          legacyAddr
        );
        this.search = cashAddr;
        this.processInput();
      }
    });
  }

  public cleanSearch() {
    this.search = '';
    this.clearInvalidAddressError();
  }

  public async handlePayId() {
    if (this.verifyPayIdSheet) {
      this.verifyPayIdSheet.onDidDismiss(() => {});
      await this.verifyPayIdSheet.dismiss();
    }
    this.clearInvalidAddressError();
    const payIdDetails = await fetchPayIdDetails(this.http, this.search);
    const address = getAddressFromPayId(payIdDetails, {
      coin: this.wallet.coin,
      network: this.wallet.network
    });
    return address
      ? this.showVerifyPayIdSheet({ payIdDetails })
      : this.showPayIdUnsupportedCoinSheet({
          payId: this.search,
          coin: this.wallet.coin.toUpperCase(),
          network: this.wallet.network
        });
  }

  public async processInput() {
    if (this.search == '') this.clearInvalidAddressError();
    if (isPayId(this.search)) {
      return this.handlePayId().catch(() => {
        this.invalidAddress = true;
        this.invalidAddressErrorMessage = 'PayID not found.';
      });
    }
    const hasContacts = await this.checkIfContact();
    if (!hasContacts) {
      const parsedData = this.incomingDataProvider.parseData(this.search);
      if (
        (parsedData && parsedData.type == 'PayPro') ||
        (parsedData && parsedData.type == 'InvoiceUri')
      ) {
        try {
          const invoiceUrl = this.incomingDataProvider.getPayProUrl(
            this.search
          );
          const payproOptions = await this.payproProvider.getPayProOptions(
            invoiceUrl
          );
          const selected = payproOptions.paymentOptions.find(
            option =>
              option.selected &&
              this.wallet.coin.toUpperCase() === option.currency
          );
          if (selected) {
            const isValid = this.checkCoinAndNetwork(selected, true);
            if (isValid) {
              this.incomingDataProvider.goToPayPro(
                payproOptions.payProUrl,
                this.wallet.coin,
                undefined,
                true
              );
            }
          } else {
            this.redir();
          }
        } catch (err) {
          this.onGoingProcessProvider.clear();
          this.invalidAddress = true;
          this.logger.warn(this.bwcErrorProvider.msg(err));
          this.errorsProvider.showDefaultError(
            this.bwcErrorProvider.msg(err),
            this.translate.instant('Error')
          );
        }
      } else if (
        parsedData &&
        _.indexOf(this.validDataTypeMap, parsedData.type) != -1
      ) {
        const isValid = this.checkCoinAndNetwork(this.search);
        if (isValid) this.redir();
      } else if (parsedData && parsedData.type == 'BitPayCard') {
        this.incomingDataProvider.redir(this.search, {
          activePage: 'SendPage'
        });
      } else if (parsedData && parsedData.type == 'PrivateKey') {
        this.incomingDataProvider.redir(this.search, {
          activePage: 'SendPage'
        });
      } else {
        this.invalidAddress = true;
      }
    } else {
      this.clearInvalidAddressError();
    }
  }

  private clearInvalidAddressError() {
    this.invalidAddress = false;
    this.invalidAddressErrorMessage = undefined;
  }

  public async checkIfContact() {
    await Observable.timer(50).toPromise();
    return this.transferTo.hasContactsOrWallets;
  }

  private checkIfLegacy(): boolean {
    return (
      this.incomingDataProvider.isValidBitcoinCashLegacyAddress(this.search) ||
      this.incomingDataProvider.isValidBitcoinCashUriWithLegacyAddress(
        this.search
      )
    );
  }

  public showPayIdUnsupportedCoinSheet(params: {
    payId: string;
    coin: string;
    network: string;
  }): void {
    console.log('in here');
    this.invalidAddress = true;
    const infoSheet = this.actionSheetProvider.createInfoSheet(
      'pay-id-unsupported-coin',
      params
    );
    console.log('infoSheet', infoSheet);
    infoSheet.present();
  }

  public showVerifyPayIdSheet(params: { payIdDetails: PayIdDetails }): void {
    this.verifyPayIdSheet = this.actionSheetProvider.createInfoSheet(
      'verify-pay-id',
      params
    );
    this.verifyPayIdSheet.present();
    this.verifyPayIdSheet.onDidDismiss(option => {
      this.verifyPayIdSheet = undefined;
      if (option) {
        const address = getAddressFromPayId(params.payIdDetails, this.wallet);
        this.navCtrl.push(VerifyPayIdPage, {
          incomingDataParams: {
            payIdDetails: params.payIdDetails,
            redirTo: 'AmountPage',
            coin: this.wallet.coin,
            value: address
          }
        });
        // const address = getAddressFromPayId(params.payIdDetails, this.wallet);
        // console.log('params', params);
        // console.log('wallet', this.wallet);
        // console.log('address', address);
        // this.incomingDataProvider.finishIncomingData({
        //   payIdDetails: params.payIdDetails,
        //   redirTo: 'AmountPage',
        //   coin: this.wallet.coin,
        //   value: address
        // });
      } else {
        this.search = '';
      }
    });
  }

  // public showConfirmPayIdSheet(params: { payIdDetails: PayIdDetails }): void {
  //   this.confirmPayIdSheet = this.actionSheetProvider.createInfoSheet(
  //     'pay-id-confirmation',
  //     params
  //   );
  //   this.confirmPayIdSheet.present();
  //   this.confirmPayIdSheet.onDidDismiss(option => {
  //     this.confirmPayIdSheet = undefined;
  //     if (option) {
  //       // getAddressFromPayId(params.payIdDetails, this.wallet);
  //       const address = getAddressFromPayId(params.payIdDetails, this.wallet);
  //       console.log('params', params);
  //       console.log('wallet', this.wallet);
  //       console.log('address', address);
  //       this.incomingDataProvider.finishIncomingData({
  //         payIdDetails: params.payIdDetails,
  //         redirTo: 'AmountPage',
  //         coin: this.wallet.coin,
  //         value: address
  //       });
  //     } else {
  //       this.search = '';
  //     }
  //   });
  // }

  public showMoreOptions(): void {
    const optionsSheet = this.actionSheetProvider.createOptionsSheet(
      'send-options',
      {
        isUtxoCoin: this.currencyProvider.isUtxoCoin(this.wallet.coin),
        isMultiSend: this.currencyProvider.isMultiSend(this.wallet.coin)
      }
    );
    optionsSheet.present();

    optionsSheet.onDidDismiss(option => {
      if (option == 'multi-send')
        this.navCtrl.push(MultiSendPage, {
          wallet: this.wallet
        });
      if (option == 'select-inputs')
        this.navCtrl.push(SelectInputsPage, {
          wallet: this.wallet
        });
    });
  }
}
