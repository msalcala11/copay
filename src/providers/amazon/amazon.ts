import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as _ from 'lodash';
import { Logger } from '../../providers/logger/logger';

// providers
import { Observable } from 'rxjs';
import { ConfigProvider } from '../config/config';
import { EmailNotificationsProvider } from '../email-notifications/email-notifications';
import { GiftCard } from '../gift-card/gift-card';
import { HomeIntegrationsProvider } from '../home-integrations/home-integrations';
import { PersistenceProvider } from '../persistence/persistence';

@Injectable()
export class AmazonProvider {
  public credentials;
  public limitPerDay: number;
  public country: string;
  public currency: string;
  public redeemAmazonUrl: string;
  public amazonNetwork: string;
  public pageTitle: string;
  public onlyIntegers: boolean;
  public userInfo: object = { email: '' };
  public supportedCurrency: 'USD' | 'JPY';

  constructor(
    private http: HttpClient,
    private logger: Logger,
    private persistenceProvider: PersistenceProvider,
    private homeIntegrationsProvider: HomeIntegrationsProvider,
    private emailNotificationsProvider: EmailNotificationsProvider,
    private configProvider: ConfigProvider
  ) {
    this.logger.info('AmazonProvider initialized.');
    this.credentials = {};
    /*
    * Development: 'testnet'
    * Production: 'livenet'
    */
    this.credentials.NETWORK = 'livenet';
    this.credentials.BITPAY_API_URL =
      this.credentials.NETWORK === 'testnet'
        ? 'https://test.bitpay.com'
        : 'https://bitpay.com';
  }

  public getNetwork(): string {
    return this.credentials.NETWORK;
  }

  public setCurrencyByLocation() {
    return this.getSupportedCurrency()
      .then(currency => this.setCountryParameters(currency))
      .catch(() => this.setCountryParameters());
  }

  private setCountryParameters(currency?: string): void {
    switch (currency) {
      case 'JPY':
        this.currency = currency;
        this.country = 'japan';
        this.limitPerDay = 200000;
        this.redeemAmazonUrl = 'https://www.amazon.co.jp/gc/redeem?claimCode=';
        this.amazonNetwork = this.getNetwork() + '-japan';
        this.pageTitle = 'Amazon.co.jp ギフト券';
        this.onlyIntegers = true;
        break;
      default:
        // For USA
        this.currency = 'USD';
        this.country = 'usa';
        this.limitPerDay = 2000;
        this.redeemAmazonUrl = 'https://www.amazon.com/gc/redeem?claimCode=';
        this.amazonNetwork = this.getNetwork();
        this.pageTitle = 'Amazon.com Gift Cards';
        this.onlyIntegers = false;
        break;
    }
    this.logger.info('Set Amazon Gift Card to: ' + this.currency);
  }

  public savePendingGiftCard(gc, opts, cb) {
    this.saveGiftCard(gc, opts).then(() => cb());
  }

  public saveGiftCard(gc, opts?) {
    return this.persistenceProvider
      .getAmazonGiftCards(this.amazonNetwork)
      .then(oldGiftCards => {
        if (_.isString(oldGiftCards)) {
          oldGiftCards = JSON.parse(oldGiftCards);
        }
        if (_.isString(gc)) {
          gc = JSON.parse(gc);
        }
        var inv = oldGiftCards || {};
        inv[gc.invoiceId] = gc;
        if (opts && (opts.error || opts.status)) {
          inv[gc.invoiceId] = _.assign(inv[gc.invoiceId], opts);
        }
        if (opts && opts.remove) {
          delete inv[gc.invoiceId];
        }

        inv = JSON.stringify(inv);
        return this.persistCards(inv);
      });
  }

  public persistCards(cardMap) {
    return this.persistenceProvider.setAmazonGiftCards(
      this.amazonNetwork,
      cardMap
    );
  }

  public getPendingGiftCards(cb) {
    this.persistenceProvider
      .getAmazonGiftCards(this.amazonNetwork)
      .then(giftCards => {
        return cb(null, giftCards && !_.isEmpty(giftCards) ? giftCards : null);
      })
      .catch(err => {
        return cb(err);
      });
  }

  public getCardMap() {
    return this.persistenceProvider.getAmazonGiftCards(this.amazonNetwork);
  }

  public async getPurchasedCards() {
    await this.setCurrencyByLocation();
    const giftCardMap = (await this.getCardMap()) || {};
    const invoiceIds = Object.keys(giftCardMap);
    return invoiceIds
      .map(invoiceId => giftCardMap[invoiceId] as GiftCard)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }

  public createBitPayInvoice(data, cb) {
    var dataSrc = {
      currency: data.currency,
      amount: data.amount,
      clientId: data.uuid,
      email: data.email,
      buyerSelectedTransactionCurrency: data.buyerSelectedTransactionCurrency
    };

    this.http
      .post(this.credentials.BITPAY_API_URL + '/amazon-gift/pay', dataSrc)
      .subscribe(
        data => {
          this.logger.info('BitPay Create Invoice: SUCCESS');
          return cb(null, data);
        },
        data => {
          this.logger.error(
            'BitPay Create Invoice: ERROR ' + data.error.message
          );
          return cb(data.error);
        }
      );
  }

  public getBitPayInvoice(id, cb) {
    this.http
      .get(this.credentials.BITPAY_API_URL + '/invoices/' + id)
      .subscribe(
        (data: any) => {
          this.logger.info('BitPay Get Invoice: SUCCESS');
          return cb(null, data.data);
        },
        data => {
          this.logger.error('BitPay Get Invoice: ERROR ' + data.error.message);
          return cb(data.error.message);
        }
      );
  }

  public createGiftCard(data, cb) {
    this.createCard(data).subscribe(data => cb(null, data), err => cb(err));
    // var dataSrc = {
    //   clientId: data.uuid,
    //   invoiceId: data.invoiceId,
    //   accessKey: data.accessKey
    // };
    // this.http
    //   .post(this.credentials.BITPAY_API_URL + '/amazon-gift/redeem', dataSrc)
    //   .subscribe(
    //     (data: any) => {
    //       var status =
    //         data.status == 'new'
    //           ? 'PENDING'
    //           : data.status == 'paid'
    //             ? 'PENDING'
    //             : data.status;
    //       data.status = status;
    //       this.logger.info('Amazon Gift Card Create/Update: ' + status);
    //       return cb(null, data);
    //     },
    //     data => {
    //       this.logger.error('Amazon Gift Card Create/Update: ' + data.message);
    //       return cb(data);
    //     }
    //   );
  }

  public createCard(data) {
    const dataSrc = {
      clientId: data.uuid,
      invoiceId: data.invoiceId,
      accessKey: data.accessKey
    };

    return this.http
      .post(this.credentials.BITPAY_API_URL + '/amazon-gift/redeem', dataSrc)
      .catch(err => {
        this.logger.error('Amazon Gift Card Create/Update: ' + data.message);
        return Observable.throw(err);
      })
      .map((data: Partial<GiftCard>) => {
        data.status = data.status === 'paid' ? 'PENDING' : data.status;
        this.logger.info('Amazon Gift Card Create/Update: ' + status);
        return data;
      });
  }

  public cancelGiftCard(data, cb) {
    var dataSrc = {
      clientId: data.uuid,
      invoiceId: data.invoiceId,
      accessKey: data.accessKey
    };

    this.http
      .post(this.credentials.BITPAY_API_URL + '/amazon-gift/cancel', dataSrc)
      .subscribe(
        data => {
          this.logger.info('Amazon Gift Card Cancel: SUCCESS');
          return cb(null, data);
        },
        data => {
          this.logger.error('Amazon Gift Card Cancel: ' + data.message);
          return cb(data);
        }
      );
  }

  public async getSupportedCurrency(): Promise<string> {
    return this.supportedCurrency
      ? Promise.resolve(this.supportedCurrency)
      : this.http
          .get(this.credentials.BITPAY_API_URL + '/amazon-gift/supportedCards')
          .toPromise()
          .then((data: any) => {
            this.logger.info('Amazon Gift Card Supported Cards: SUCCESS');
            this.supportedCurrency = data.supportedCards[0];
            return this.supportedCurrency;
          })
          .catch(err => {
            this.logger.error(
              'Amazon Gift Card Supported Cards: ' + err.message
            );
            throw err;
          });
  }

  public emailIsValid(email: string): boolean {
    let validEmail = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
      email
    );
    if (!validEmail) return false;
    return true;
  }

  public storeEmail(email: string): void {
    this.setUserInfo({ email });
  }

  public getUserEmail(): Promise<string> {
    return this.persistenceProvider
      .getAmazonUserInfo()
      .then(data => {
        if (_.isString(data)) {
          data = JSON.parse(data);
        }
        let email =
          data && data.email
            ? data.email
            : this.emailNotificationsProvider.getEmailIfEnabled();
        return email;
      })
      .catch(_ => {});
  }

  private setUserInfo(data: any): void {
    if (!_.isString(data)) data = JSON.stringify(data);
    this.persistenceProvider.setAmazonUserInfo(data);
  }

  public register() {
    const showItem = !!this.configProvider.get().showIntegration['amazon'];
    this.homeIntegrationsProvider.register({
      name: 'amazon',
      title: 'Amazon Gift Cards',
      icon: 'assets/img/amazon/amazon-icon.svg',
      page: 'AmazonPage',
      show: showItem
    });
  }
}
