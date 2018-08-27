import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { App, ModalController, NavController, NavParams } from 'ionic-angular';
import * as _ from 'lodash';
import * as moment from 'moment';
import { Logger } from '../../../../providers/logger/logger';

// Pages
import { FinishModalPage } from '../../../finish/finish';

// Provider
import { DecimalPipe } from '@angular/common';
import {
  FeeProvider,
  TxConfirmNotificationProvider,
  WalletTabsProvider
} from '../../../../providers';
import { ActionSheetProvider } from '../../../../providers/action-sheet/action-sheet';
import { AmazonProvider } from '../../../../providers/amazon/amazon';
import { BwcErrorProvider } from '../../../../providers/bwc-error/bwc-error';
import { BwcProvider } from '../../../../providers/bwc/bwc';
import { ConfigProvider } from '../../../../providers/config/config';
import { ExternalLinkProvider } from '../../../../providers/external-link/external-link';
import {
  CardBrand,
  CardConifg,
  GiftCard,
  GiftCardProvider
} from '../../../../providers/gift-card/gift-card';
import { OnGoingProcessProvider } from '../../../../providers/on-going-process/on-going-process';
import { PayproProvider } from '../../../../providers/paypro/paypro';
import { PlatformProvider } from '../../../../providers/platform/platform';
import { PopupProvider } from '../../../../providers/popup/popup';
import { ProfileProvider } from '../../../../providers/profile/profile';
import { ReplaceParametersProvider } from '../../../../providers/replace-parameters/replace-parameters';
import { TxFormatProvider } from '../../../../providers/tx-format/tx-format';
import {
  TransactionProposal,
  WalletProvider
} from '../../../../providers/wallet/wallet';
import { ConfirmPage } from '../../../send/confirm/confirm';
import { CardDetailsPage } from '../../gift-cards/card-details/card-details';

@Component({
  selector: 'confirm-card-purchase-page',
  templateUrl: 'confirm-card-purchase.html'
})
export class ConfirmCardPurchasePage extends ConfirmPage {
  public currency: string;
  private message: string;
  private invoiceId: string;
  private configWallet;
  public currencyIsoCode: string;

  public totalAmountStr: string;
  public invoiceFee: number;
  public networkFee: number;
  public totalAmount: number;
  public amazonGiftCard;
  public amountUnitStr: string;
  public network: string;
  public onlyIntegers: boolean;

  public amazonBrand: CardBrand.amazon = CardBrand.amazon;
  public cardConfig: CardConifg;

  constructor(
    actionSheetProvider: ActionSheetProvider,
    app: App,
    private amazonProvider: AmazonProvider,
    bwcErrorProvider: BwcErrorProvider,
    bwcProvider: BwcProvider,
    configProvider: ConfigProvider,
    decimalPipe: DecimalPipe,
    feeProvider: FeeProvider,
    private giftCardProvider: GiftCardProvider,
    replaceParametersProvider: ReplaceParametersProvider,
    externalLinkProvider: ExternalLinkProvider,
    logger: Logger,
    modalCtrl: ModalController,
    navCtrl: NavController,
    navParams: NavParams,
    onGoingProcessProvider: OnGoingProcessProvider,
    popupProvider: PopupProvider,
    profileProvider: ProfileProvider,
    txConfirmNotificationProvider: TxConfirmNotificationProvider,
    txFormatProvider: TxFormatProvider,
    walletProvider: WalletProvider,
    translate: TranslateService,
    private payproProvider: PayproProvider,
    platformProvider: PlatformProvider,
    walletTabsProvider: WalletTabsProvider
  ) {
    super(
      actionSheetProvider,
      app,
      bwcErrorProvider,
      bwcProvider,
      configProvider,
      decimalPipe,
      externalLinkProvider,
      feeProvider,
      logger,
      modalCtrl,
      navCtrl,
      navParams,
      onGoingProcessProvider,
      platformProvider,
      profileProvider,
      popupProvider,
      replaceParametersProvider,
      translate,
      txConfirmNotificationProvider,
      txFormatProvider,
      walletProvider,
      walletTabsProvider
    );

    this.configWallet = this.configProvider.get().wallet;
    this.amazonGiftCard = null;
  }

  async ngOnInit() {
    this.amount = this.navParams.data.amount;
    this.currency = this.navParams.data.currency;
    this.cardConfig = await this.giftCardProvider.getCardConfig(
      this.navParams.get('cardName')
    );
    this.onlyIntegers = this.cardConfig.currency === 'JPY';
  }

  ionViewDidLoad() {
    this.logger.info('ionViewDidLoad ConfirmCardPurchasePage');
  }

  ionViewWillEnter() {
    this.isOpenSelector = false;
    this.navCtrl.swipeBackEnabled = false;

    this.network = this.giftCardProvider.getNetwork();
    this.wallets = this.profileProvider.getWallets({
      onlyComplete: true,
      network: this.network,
      hasFunds: true
    });
    if (_.isEmpty(this.wallets)) {
      this.showErrorAndBack(
        null,
        this.translate.instant('No wallets available')
      );
      return;
    }
    this.showWallets(); // Show wallet selector
  }

  public cancel() {
    this.navCtrl.popToRoot();
  }

  private checkFeeHigh(amount: number, fee: number) {
    if (this.isHighFee(amount, fee)) {
      this.showHighFeeSheet();
    }
  }

  public openExternalLink(url: string) {
    this.externalLinkProvider.open(url);
  }

  private resetValues() {
    this.totalAmountStr = this.invoiceFee = this.networkFee = this.totalAmount = this.wallet = null;
    this.tx = this.message = this.invoiceId = null;
  }

  private showErrorAndBack(title: string, msg) {
    if (this.isCordova) this.slideButton.isConfirmed(false);
    title = title ? title : this.translate.instant('Error');
    this.logger.error(msg);
    msg = msg && msg.errors ? msg.errors[0].message : msg;
    this.popupProvider.ionicAlert(title, msg).then(() => {
      this.navCtrl.pop();
    });
  }

  private showError = function(title: string, msg): Promise<any> {
    return new Promise(resolve => {
      if (this.isCordova) this.slideButton.isConfirmed(false);
      title = title || this.translate.instant('Error');
      this.logger.error(msg);
      msg = msg && msg.errors ? msg.errors[0].message : msg;
      this.popupProvider.ionicAlert(title, msg).then(() => {
        return resolve();
      });
    });
  };

  async publishAndSign(wallet, txp) {
    if (!wallet.canSign() && !wallet.isPrivKeyExternal()) {
      const err = this.translate.instant('No signing proposal: No private key');
      return Promise.reject(err);
    }
    await this.walletProvider.publishAndSign(wallet, txp).catch(err => {
      this.onGoingProcessProvider.clear();
      throw err;
    });
    return this.onGoingProcessProvider.clear();
  }

  private satToFiat(coin: string, sat: number) {
    return this.txFormatProvider.toFiat(coin, sat, this.currencyIsoCode);
  }

  private async setTotalAmount(
    wallet,
    amountSat: number,
    invoiceFeeSat: number,
    networkFeeSat: number
  ) {
    const amount = await this.satToFiat(wallet.coin, amountSat);
    this.amount = Number(amount);

    const invoiceFee = await this.satToFiat(wallet.coin, invoiceFeeSat);
    this.invoiceFee = Number(invoiceFee);

    const networkFee = await this.satToFiat(wallet.coin, networkFeeSat);
    this.networkFee = Number(networkFee);
    this.totalAmount = this.amount + this.invoiceFee + this.networkFee;
  }

  private isCryptoCurrencySupported(wallet, invoice) {
    const COIN = wallet.coin.toUpperCase();
    return (
      (invoice['supportedTransactionCurrencies'][COIN] &&
        invoice['supportedTransactionCurrencies'][COIN].enabled) ||
      false
    );
  }

  private handleCreateInvoiceError(err) {
    let err_title = this.translate.instant('Error creating the invoice');
    let err_msg;
    if (err && err.message && err.message.match(/suspended/i)) {
      err_title = this.translate.instant('Service not available');
      err_msg = this.translate.instant(
        'Amazon.com is not available at this moment. Please try back later.'
      );
    } else if (err && err.message) {
      err_msg = err.message;
    } else {
      err_msg = this.translate.instant('Could not access to Amazon.com');
    }

    throw {
      title: err_title,
      message: err_msg
    };
  }

  public async createInvoice(data) {
    const cardOrder = await this.giftCardProvider
      .createBitpayInvoice(data)
      .catch(err => this.handleCreateInvoiceError(err));

    const accessKey = cardOrder && cardOrder.accessKey;
    if (!accessKey) {
      throw {
        message: this.translate.instant('No access key defined')
      };
    }
    const invoice = await this.giftCardProvider
      .getBitPayInvoice(cardOrder.invoiceId)
      .catch(() => {
        throw {
          message: this.translate.instant('Could not get the invoice')
        };
      });
    return { invoice, accessKey };
  }

  private async createTx(wallet, invoice, message: string) {
    const COIN = wallet.coin.toUpperCase();
    const payProUrl =
      invoice && invoice.paymentCodes ? invoice.paymentCodes[COIN].BIP73 : null;

    if (!payProUrl) {
      throw {
        title: this.translate.instant('Error in Payment Protocol'),
        message: this.translate.instant('Invalid URL')
      };
    }

    const details = await this.payproProvider
      .getPayProDetails(payProUrl, wallet.coin)
      .catch(err => {
        throw {
          title: this.translate.instant('Error in Payment Protocol'),
          message: err
        };
      });

    const txp: Partial<TransactionProposal> = {
      amount: details.amount,
      toAddress: details.toAddress,
      outputs: [
        {
          toAddress: details.toAddress,
          amount: details.amount,
          message
        }
      ],
      message,
      customData: {
        service: 'amazon'
      },
      payProUrl,
      excludeUnconfirmedUtxos: this.configWallet.spendUnconfirmed ? false : true
    };

    if (details.requiredFeeRate) {
      txp.feePerKb = Math.ceil(details.requiredFeeRate * 1024);
      this.logger.debug(
        'Using merchant fee rate (for amazon gc):' + txp.feePerKb
      );
    } else {
      txp.feeLevel = this.configWallet.settings.feeLevel || 'normal';
    }

    txp['origToAddress'] = txp.toAddress;

    if (wallet.coin && wallet.coin == 'bch') {
      // Use legacy address
      txp.toAddress = this.bitcoreCash.Address(txp.toAddress).toString();
      txp.outputs[0].toAddress = txp.toAddress;
    }

    return this.walletProvider.createTx(wallet, txp).catch(err => {
      throw {
        title: this.translate.instant('Could not create transaction'),
        message: this.bwcErrorProvider.msg(err)
      };
    });
  }

  private async createGiftCard(purchaseDetails: GiftCard) {
    const card = await this.giftCardProvider
      .createGiftCard({ ...purchaseDetails, cardConfig: this.cardConfig })
      .toPromise()
      .catch(() => ({ status: 'FAILURE' }));

    await this.giftCardProvider.saveGiftCard(card);
    this.onGoingProcessProvider.clear();
    this.logger.debug('Saved new gift card with status: ' + card.status);
    this.amazonGiftCard = card;
    this.openFinishModal();
  }

  private async promptEmail() {
    if (!this.cardConfig.emailRequired) {
      return Promise.resolve();
    }
    const email = await this.amazonProvider.getUserEmail();
    if (email) return Promise.resolve(email);
    const title = this.translate.instant('Enter email address');
    const message = this.translate.instant(
      'Where do you want to receive your purchase receipt'
    );
    const opts = { type: 'email', defaultText: email || '' };
    const newEmail = await this.popupProvider.ionicPrompt(title, message, opts);
    if (!newEmail || !this.amazonProvider.emailIsValid(email)) {
      this.throwEmailRequiredError();
    }
    this.amazonProvider.storeEmail(email);
    return email;
  }

  private throwEmailRequiredError() {
    const title = this.translate.instant('Error');
    const msg = this.translate.instant(
      'Email address is needed to purchase Gift Cards'
    );
    this.onGoingProcessProvider.clear();
    this.showErrorAndBack(title, msg);
    throw new Error('email required');
  }

  private async initialize(wallet) {
    const COIN = wallet.coin.toUpperCase();
    const parsedAmount = this.txFormatProvider.parseAmount(
      wallet.coin,
      this.amount,
      this.currency,
      this.onlyIntegers
    );
    this.currencyIsoCode = parsedAmount.currency;
    this.amountUnitStr = parsedAmount.amountUnitStr;

    const email = await this.promptEmail();
    const dataSrc = {
      amount: parsedAmount.amount,
      currency: parsedAmount.currency,
      uuid: wallet.id,
      email,
      buyerSelectedTransactionCurrency: COIN,
      cardName: this.cardConfig.name
    };
    this.onGoingProcessProvider.set('loadingTxInfo');

    const data = await this.createInvoice(dataSrc).catch(err => {
      this.onGoingProcessProvider.clear();
      throw this.showErrorAndBack(err.title, err.message);
    });
    const invoice = data.invoice;
    const accessKey = data.accessKey;

    if (!this.isCryptoCurrencySupported(wallet, invoice)) {
      this.onGoingProcessProvider.clear();
      let msg = this.translate.instant(
        'Purchases with this cryptocurrency are not enabled'
      );
      this.showErrorAndBack(null, msg);
      return;
    }

    // Sometimes API does not return this element;
    invoice['minerFees'][COIN]['totalFee'] =
      invoice.minerFees[COIN].totalFee || 0;
    let invoiceFeeSat = invoice.minerFees[COIN].totalFee;

    this.message = this.replaceParametersProvider.replace(
      this.translate.instant('{{amountUnitStr}} Gift Card'),
      { amountUnitStr: this.amountUnitStr }
    );

    const ctxp = await this.createTx(wallet, invoice, this.message).catch(
      err => {
        this.onGoingProcessProvider.clear();
        this.resetValues();
        throw this.showError(err.title, err.message);
      }
    );

    this.onGoingProcessProvider.clear();

    // Save in memory
    this.tx = ctxp;
    this.invoiceId = invoice.id;

    this.tx.giftData = {
      currency: dataSrc.currency,
      amount: dataSrc.amount,
      uuid: dataSrc.uuid,
      accessKey,
      invoiceId: invoice.id,
      invoiceUrl: invoice.url,
      invoiceTime: invoice.invoiceTime
    };
    this.totalAmountStr = this.txFormatProvider.formatAmountStr(
      wallet.coin,
      ctxp.amount
    );

    // Warn: fee too high
    this.checkFeeHigh(
      Number(parsedAmount.amountSat),
      Number(invoiceFeeSat) + Number(ctxp.fee)
    );

    this.setTotalAmount(
      wallet,
      parsedAmount.amountSat,
      invoiceFeeSat,
      ctxp.fee
    );
  }

  public async buyConfirm() {
    if (!this.tx) {
      this.showError(
        null,
        this.translate.instant('Transaction has not been created')
      );
      return;
    }
    const title = this.translate.instant('Confirm');
    const okText = this.translate.instant('OK');
    const cancelText = this.translate.instant('Cancel');
    const confirm = await this.popupProvider.ionicConfirm(
      title,
      this.message,
      okText,
      cancelText
    );
    if (!confirm) {
      if (this.isCordova) this.slideButton.isConfirmed(false);
      return;
    }

    return this.publishAndSign(this.wallet, this.tx)
      .then(() => {
        this.onGoingProcessProvider.set('buyingGiftCard');
        return this.createGiftCard(this.tx.giftData);
      })
      .catch(err => {
        this.resetValues();
        this.showError(
          this.translate.instant('Could not send transaction'),
          this.bwcErrorProvider.msg(err)
        );
      });
  }

  public onWalletSelect(wallet): void {
    this.wallet = wallet;
    this.initialize(wallet).catch(() => {});
  }

  public showWallets(): void {
    this.isOpenSelector = true;
    let id = this.wallet ? this.wallet.credentials.walletId : null;
    const params = {
      wallets: this.wallets,
      selectedWalletId: id,
      title: 'Buy from'
    };
    const walletSelector = this.actionSheetProvider.createWalletSelector(
      params
    );
    walletSelector.present();
    walletSelector.onDidDismiss(wallet => {
      if (!_.isEmpty(wallet)) this.onWalletSelect(wallet);
      this.isOpenSelector = false;
    });
  }

  async openFinishModal() {
    let finishComment: string;
    let cssClass: string;
    if (this.amazonGiftCard.status == 'FAILURE') {
      finishComment = this.translate.instant(
        'Your purchase could not be completed'
      );
      cssClass = 'danger';
    }
    if (this.amazonGiftCard.status == 'PENDING') {
      finishComment = this.translate.instant(
        'Your purchase was added to the list of pending'
      );
      cssClass = 'warning';
    }
    if (this.amazonGiftCard.status == 'SUCCESS') {
      finishComment = this.replaceParametersProvider.replace(
        this.translate.instant('Bought {{ amount }}'),
        { amount: this.amountUnitStr }
      );
    }
    if (this.amazonGiftCard.status == 'SUCCESS') {
      finishComment = this.translate.instant(
        'Gift card generated and ready to use.'
      );
    }
    let finishText = '';
    let modal = this.modalCtrl.create(
      FinishModalPage,
      { finishText, finishComment, cssClass },
      { showBackdrop: true, enableBackdropDismiss: false }
    );
    await modal.present();

    await this.navCtrl.popToRoot({ animate: false });
    await this.navCtrl.parent.select(0);
    await this.navCtrl.push(
      CardDetailsPage,
      { card: { ...this.amazonGiftCard, name: this.cardConfig.name } },
      { animate: false }
    );
  }
}
