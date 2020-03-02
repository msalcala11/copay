import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { NavController } from 'ionic-angular';
import * as _ from 'lodash';
import * as moment from 'moment';

// Proviers
import { ActionSheetProvider } from '../../../../providers/action-sheet/action-sheet';
import { AppProvider } from '../../../../providers/app/app';
import { ConfigProvider } from '../../../../providers/config/config';
import { CurrencyProvider } from '../../../../providers/currency/currency';
import { ErrorsProvider } from '../../../../providers/errors/errors';
import { ExternalLinkProvider } from '../../../../providers/external-link/external-link';
import { Logger } from '../../../../providers/logger/logger';
import { PersistenceProvider } from '../../../../providers/persistence/persistence';
import { PlatformProvider } from '../../../../providers/platform/platform';
import { PopupProvider } from '../../../../providers/popup/popup';
import { ProfileProvider } from '../../../../providers/profile/profile';
import { RateProvider } from '../../../../providers/rate/rate';
import { SimplexProvider } from '../../../../providers/simplex/simplex';
import { WalletProvider } from '../../../../providers/wallet/wallet';

@Component({
  selector: 'page-simplex-buy',
  templateUrl: 'simplex-buy.html'
})
export class SimplexBuyPage {
  public isOpenSelector: boolean;
  public wallet;
  public wallets: any[];
  public quoteForm: FormGroup;
  public cryptoAmount: number;
  public fiatBaseAmount: number;
  public fiatTotalAmount: number;
  public fiatCurrency: string;
  public okText: string;
  public cancelText: string;
  public validUntil: string;
  public showLoading: boolean;
  public minFiatAmount: number;
  public maxFiatAmount: number;
  public supportedFiatAltCurrencies: string[];
  public altCurrenciesToShow: string[];
  public altCurrenciesToShow2: string[];
  public altCurrencyInitial: string;
  public selectOptions;

  // Platform info
  public isCordova: boolean;
  public hideSlideButton: boolean;

  private quoteId: string;
  private createdOn: string;

  constructor(
    private actionSheetProvider: ActionSheetProvider,
    private appProvider: AppProvider,
    private configProvider: ConfigProvider,
    private currencyProvider: CurrencyProvider,
    private errorsProvider: ErrorsProvider,
    private externalLinkProvider: ExternalLinkProvider,
    private fb: FormBuilder,
    private logger: Logger,
    private navCtrl: NavController,
    private persistenceProvider: PersistenceProvider,
    private platformProvider: PlatformProvider,
    private popupProvider: PopupProvider,
    private profileProvider: ProfileProvider,
    private rateProvider: RateProvider,
    private simplexProvider: SimplexProvider,
    private translate: TranslateService,
    private walletProvider: WalletProvider
  ) {
    this.isCordova = this.platformProvider.isCordova;
    this.hideSlideButton = false;
    this.altCurrenciesToShow2 = [];
    this.supportedFiatAltCurrencies = this.simplexProvider.getSupportedFiatAltCurrencies();
    const config = this.configProvider.get();
    const isoCode = config.wallet.settings.alternativeIsoCode;

    this.altCurrencyInitial =
      this.simplexProvider.getSupportedFiatAltCurrencies().indexOf(isoCode) > -1
        ? isoCode
        : 'USD';

    this.quoteForm = this.fb.group({
      amount: [
        200,
        [Validators.required, Validators.min(50), Validators.max(20000)]
      ],
      altCurrency: [this.altCurrencyInitial, [Validators.required]]
    });

    this.persistenceProvider.getProfile().then(profile => {
      this.createdOn =
        profile && profile.createdOn
          ? moment(profile.createdOn).format('YYYY-MM-DDTHH:mm:ss.SSSZ')
          : moment().format('YYYY-MM-DDTHH:mm:ss.SSSZ');
    });

    this.wallets = this.profileProvider.getWallets({
      network: 'livenet',
      onlyComplete: true,
      coin: ['btc', 'bch', 'eth', 'xrp'],
      backedUp: true
    });
    this.altCurrenciesToShow = ['USD', 'EUR'];

    if (this.altCurrenciesToShow.indexOf(this.altCurrencyInitial) < 0)
      this.altCurrenciesToShow.push(this.altCurrencyInitial);

    this.selectOptions = {
      title: this.translate.instant('Select Currency'),
      cssClass: 'simplex-currency-' + (this.altCurrenciesToShow.length + 1)
    };

    this.supportedFiatAltCurrencies.forEach((currency: string) => {
      if (this.altCurrenciesToShow.indexOf(currency) < 0)
        this.altCurrenciesToShow2.push(currency);
    });

    this.okText = this.translate.instant('Select');
    this.cancelText = this.translate.instant('Cancel');
    this.showLoading = false;
    this.minFiatAmount = 50;
    this.maxFiatAmount = 20000;

    if (this.isCordova) {
      window.addEventListener('keyboardWillShow', () => {
        this.hideSlideButton = true;
      });

      window.addEventListener('keyboardWillHide', () => {
        this.hideSlideButton = false;
      });
    }
  }

  ionViewDidLoad() {
    this.logger.info('Loaded: SimplexBuyPage');
  }

  ionViewWillEnter() {
    if (_.isEmpty(this.wallets)) {
      this.showError(
        this.translate.instant('You do not have wallets able to receive funds')
      );
    } else {
      if (this.wallets.length == 1) this.onWalletSelect(this.wallets[0]);
      else this.showWallets();
    }
  }

  private calculateFiatRate(
    amount: number,
    fiatCurrency: string,
    cryptoCurrency: string
  ): number {
    if (_.includes(['USD', 'EUR'], fiatCurrency)) {
      return amount;
    }
    const rateFromFiat = this.rateProvider.fromFiat(
      amount,
      'USD',
      cryptoCurrency
    );
    return +this.rateProvider
      .toFiat(rateFromFiat, fiatCurrency, cryptoCurrency)
      .toFixed(2);
  }

  public showWallets(): void {
    this.isOpenSelector = true;
    const id = this.wallet ? this.wallet.credentials.walletId : null;
    const params = {
      wallets: this.wallets,
      selectedWalletId: id,
      title: this.translate.instant('Select wallet to deposit to')
    };
    const walletSelector = this.actionSheetProvider.createWalletSelector(
      params
    );
    walletSelector.present();
    walletSelector.onDidDismiss(wallet => {
      this.onSelectWalletEvent(wallet);
    });
  }

  private onSelectWalletEvent(wallet): void {
    if (!_.isEmpty(wallet)) this.onWalletSelect(wallet);
    this.isOpenSelector = false;
  }

  public currencyIsFiat(): boolean {
    return (
      this.altCurrenciesToShow.indexOf(this.quoteForm.value.altCurrency) > -1 ||
      this.altCurrenciesToShow2.indexOf(this.quoteForm.value.altCurrency) > -1
    );
  }

  public onWalletSelect(wallet): void {
    this.setWallet(wallet);
    this.setDefaultValues();
    this.amountChange();
  }

  private setWallet(wallet): void {
    this.wallet = wallet;
  }

  private setDefaultValues() {
    this.quoteForm.controls['amount'].setValue(undefined);
    if (!this.currencyIsFiat())
      this.quoteForm.controls['altCurrency'].setValue(this.altCurrencyInitial);
    const min = this.calculateFiatRate(
      50,
      this.quoteForm.value.altCurrency,
      this.wallet.coin
    );
    const max = this.calculateFiatRate(
      20000,
      this.quoteForm.value.altCurrency,
      this.wallet.coin
    );
    this.quoteForm.controls['amount'].setValidators([
      Validators.required,
      Validators.min(min),
      Validators.max(max)
    ]);
    this.minFiatAmount = min;
    this.maxFiatAmount = max;
    this.quoteForm.controls['amount'].setValue(
      this.simplexProvider.supportedFiatAltCurrencies[
        this.quoteForm.value.altCurrency
      ].defaultValue
    );
  }

  public altCurrencyChange(): void {
    this.logger.debug(
      'altCurrency changed to: ' + this.quoteForm.value.altCurrency
    );
    if (!this.wallet) return;

    if (this.currencyIsFiat()) {
      this.quoteForm.controls['amount'].setValue(undefined);
      const min = this.calculateFiatRate(
        50,
        this.quoteForm.value.altCurrency,
        this.wallet.coin
      );
      const max = this.calculateFiatRate(
        20000,
        this.quoteForm.value.altCurrency,
        this.wallet.coin
      );
      this.quoteForm.controls['amount'].setValidators([
        Validators.required,
        Validators.min(min),
        Validators.max(max)
      ]);
      this.minFiatAmount = min;
      this.maxFiatAmount = max;
      this.quoteForm.controls['amount'].setValue(
        this.simplexProvider.supportedFiatAltCurrencies[
          this.quoteForm.value.altCurrency
        ].defaultValue
      );
    } else {
      this.quoteForm.controls['amount'].setValue(undefined);

      let coin = this.quoteForm.value.altCurrency.toLowerCase();
      let alternative = 'USD';
      let min = +(
        this.rateProvider.fromFiat(50, alternative, coin) /
        this.currencyProvider.getPrecision(coin).unitToSatoshi
      ).toFixed(8);
      let max = +(
        this.rateProvider.fromFiat(20000, alternative, coin) /
        this.currencyProvider.getPrecision(coin).unitToSatoshi
      ).toFixed(8);

      this.quoteForm.controls['amount'].setValidators([
        Validators.required,
        Validators.min(min),
        Validators.max(max)
      ]);
      this.minFiatAmount = min;
      this.maxFiatAmount = max;
      this.quoteForm.controls['amount'].setValue(1);
    }

    this.amountChange();
  }

  public amountChange(): void {
    if (this.quoteForm.valid && !_.isEmpty(this.wallet)) {
      this.debounceAmountInput();
    }
  }

  private debounceAmountInput = _.debounce(
    () => {
      this.getSimplexQuote();
    },
    1500,
    {
      leading: true
    }
  );

  private getSimplexQuote(): void {
    this.logger.debug('Simplex getting quote');

    this.showLoading = true;
    const data = {
      digital_currency: this.currencyProvider.getChain(this.wallet.coin),
      fiat_currency: this.currencyIsFiat()
        ? this.quoteForm.value.altCurrency
        : this.altCurrencyInitial,
      requested_currency: this.quoteForm.value.altCurrency,
      requested_amount: +this.quoteForm.value.amount,
      end_user_id: this.wallet.id
    };

    this.simplexProvider
      .getQuote(this.wallet, data)
      .then(data => {
        if (data && data.quote_id) {
          this.logger.debug('Simplex getting quote: SUCCESS');
          this.cryptoAmount = data.digital_money.amount;
          this.fiatBaseAmount = data.fiat_money.base_amount;
          this.fiatTotalAmount = data.fiat_money.total_amount;
          this.fiatCurrency = data.fiat_money.currency;
          this.quoteId = data.quote_id;
          this.validUntil = data.valid_until;
          this.showLoading = false;
        } else {
          const err = this.translate.instant(
            "Can't get rates at this moment. Please try again later"
          );
          this.showError(err);
        }
      })
      .catch(err => {
        this.showError(err);
      });
  }

  simplexPaymentRequest(address: string): Promise<any> {
    this.logger.debug('Simplex creating payment request');
    const userAgent = this.platformProvider.getUserAgent();
    const data = {
      account_details: {
        app_version_id: this.appProvider.info.version,
        app_install_date: this.createdOn,
        app_end_user_id: this.wallet.id,
        signup_login: {
          user_agent: userAgent, // Format: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:67.0) Gecko/20100101 Firefox/67.0'
          timestamp: moment().format('YYYY-MM-DDTHH:mm:ss.SSSZ')
        }
      },
      transaction_details: {
        payment_details: {
          quote_id: this.quoteId,
          fiat_total_amount: {
            currency: this.currencyIsFiat()
              ? this.quoteForm.value.altCurrency
              : this.altCurrencyInitial,
            amount: this.fiatTotalAmount
          },
          requested_digital_amount: {
            currency: this.currencyProvider.getChain(this.wallet.coin),
            amount: this.cryptoAmount
          },
          destination_wallet: {
            currency: this.currencyProvider.getChain(this.wallet.coin),
            address,
            tag: ''
          },
          original_http_ref_url:
            'https://' + this.simplexProvider.passthrough_uri
        }
      }
    };

    return this.simplexProvider.paymentRequest(this.wallet, data);
  }

  public simplexPaymentFormSubmission(data) {
    const dataSrc = {
      version: '1',
      partner: data.app_provider_id,
      payment_flow_type: 'wallet',
      return_url_success:
        this.simplexProvider.passthrough_uri +
        'end.html?success=true&paymentId=' +
        data.payment_id +
        '&quoteId=' +
        this.quoteId +
        '&userId=' +
        this.wallet.id +
        '&returnApp=' +
        this.appProvider.info.name,
      return_url_fail:
        this.simplexProvider.passthrough_uri +
        'end.html?success=false&paymentId=' +
        data.payment_id +
        '&quoteId=' +
        this.quoteId +
        '&userId=' +
        this.wallet.id +
        '&returnApp=' +
        this.appProvider.info.name,
      quote_id: this.quoteId,
      payment_id: data.payment_id,
      user_id: this.wallet.id,
      'destination_wallet[address]': data.address,
      'destination_wallet[currency]': this.currencyProvider.getChain(
        this.wallet.coin
      ),
      'fiat_total_amount[amount]': this.fiatTotalAmount,
      'fiat_total_amount[currency]': this.currencyIsFiat()
        ? this.quoteForm.value.altCurrency
        : this.altCurrencyInitial,
      'digital_total_amount[amount]': this.cryptoAmount,
      'digital_total_amount[currency]': this.currencyProvider.getChain(
        this.wallet.coin
      )
    };

    let str = '';
    for (let key in dataSrc) {
      if (str != '') {
        str += '&';
      }
      str += key + '=' + encodeURIComponent(dataSrc[key]);
    }

    const api_host = this.simplexProvider.getCheckoutUrl();

    const url =
      this.simplexProvider.passthrough_uri +
      '?api_host=' +
      api_host +
      '/payments/new/&' +
      str;

    this.logger.debug('Simplex ready for payment form submission');

    this.openExternalLink(url);
  }

  public openPopUpConfirmation(): void {
    const title = this.translate.instant('Continue to Simplex');
    const message = this.translate.instant(
      'In order to finish the payment process you will be redirected to Simplex page'
    );
    const okText = this.translate.instant('Continue');
    const cancelText = this.translate.instant('Go back');
    this.popupProvider
      .ionicConfirm(title, message, okText, cancelText)
      .then((res: boolean) => {
        if (res) this.continueToSimplex();
      });
  }

  public continueToSimplex(): void {
    this.walletProvider
      .getAddress(this.wallet, false)
      .then(address => {
        this.simplexPaymentRequest(address)
          .then(req => {
            if (req && req.error && !_.isEmpty(req.error)) {
              this.showError(req.error);
              return;
            }

            this.logger.debug('Simplex creating payment request: SUCCESS');

            const remoteData: any = {
              address,
              api_host: req.api_host,
              app_provider_id: req.app_provider_id,
              order_id: req.order_id,
              payment_id: req.payment_id
            };

            let newData = {
              address,
              created_on: Date.now(),
              crypto_amount: this.cryptoAmount,
              coin: this.currencyProvider.getChain(this.wallet.coin),
              fiat_base_amount: this.fiatBaseAmount,
              fiat_total_amount: this.fiatTotalAmount,
              fiat_total_amount_currency: this.currencyIsFiat()
                ? this.quoteForm.value.altCurrency
                : this.altCurrencyInitial,
              order_id: req.order_id,
              payment_id: req.payment_id,
              status: 'paymentRequestSent',
              user_id: this.wallet.id
            };
            this.simplexProvider
              .saveSimplex(newData, null)
              .then(() => {
                this.logger.debug(
                  'Saved Simplex with status: ' + newData.status
                );
                this.simplexPaymentFormSubmission(remoteData);
                setTimeout(() => {
                  this.navCtrl.popToRoot();
                }, 2500);
              })
              .catch(err => {
                this.showError(err);
              });
          })
          .catch(err => {
            this.showError(err);
          });
      })
      .catch(err => {
        return this.showError(err);
      });
  }

  public openExternalLink(url: string) {
    this.externalLinkProvider.open(url);
  }

  private showError(err?) {
    this.showLoading = false;
    let msg = this.translate.instant(
      'Could not create payment request. Please, try again later.'
    );
    if (err) {
      if (_.isString(err)) {
        msg = err;
      } else {
        if (err.error && err.error.error) msg = err.error.error;
        else if (err.message) msg = err.message;
      }
    }

    this.logger.error('Simplex error: ' + msg);

    const title = this.translate.instant('Error');
    this.errorsProvider.showDefaultError(msg, title, () => {
      this.navCtrl.pop();
    });
  }
}
