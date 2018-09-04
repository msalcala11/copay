import { Injectable } from '@angular/core';
import { Logger } from '../../providers/logger/logger';

// providers
import { ConfigProvider } from '../config/config';
import { HomeIntegrationsProvider } from '../home-integrations/home-integrations';
import { PersistenceProvider } from '../persistence/persistence';

import * as _ from 'lodash';
import { GiftCard } from '../gift-card/gift-card';

@Injectable()
export class MercadoLibreProvider {
  private credentials;
  // private availableCountries;

  constructor(
    private persistenceProvider: PersistenceProvider,
    private homeIntegrationsProvider: HomeIntegrationsProvider,
    private logger: Logger,
    private configProvider: ConfigProvider
  ) {
    this.logger.info('MercadoLibreProvider initialized');
    // Not used yet
    /* this.availableCountries = [{
      'country': 'Brazil',
      'currency': 'BRL',
      'name': 'Mercado Livre',
      'url': 'https://www.mercadolivre.com.br'
    }]; */

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

  public getNetwork() {
    return this.credentials.NETWORK;
  }

  public setCredentials(credentials) {
    this.credentials = credentials;
  }

  public getCardMap() {
    return this.persistenceProvider.getMercadoLibreGiftCards(this.getNetwork());
  }

  public persistCards(cardMap) {
    return this.persistenceProvider.setMercadoLibreGiftCards(
      this.getNetwork(),
      cardMap
    );
  }

  public getPendingGiftCards(cb) {
    const network = this.getNetwork();
    return this.persistenceProvider
      .getMercadoLibreGiftCards(network)
      .then(giftCards => {
        var _gcds = giftCards ? giftCards : null;
        return cb(null, _gcds);
      });
  }

  public async getPurchasedCards() {
    const network = this.getNetwork();
    const giftCardMap =
      (await this.persistenceProvider.getMercadoLibreGiftCards(network)) || {};
    const invoiceIds = Object.keys(giftCardMap);
    return invoiceIds
      .map(invoiceId => {
        const card = giftCardMap[invoiceId];
        return { ...card, claimCode: card.pin } as GiftCard;
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }

  /*
 * Disabled for now *
 */
  /*
  public cancelGiftCard(data, cb) {

    var dataSrc = {
      "clientId": data.uuid,
      "invoiceId": data.invoiceId,
      "accessKey": data.accessKey
    };
    let url = this.credentials.BITPAY_API_URL + '/mercado-libre-gift/cancel';
    let headers = {
      'content-type': 'application/json'
    };
    this.http.post(url, dataSrc, headers).subscribe((data) => {
      this.logger.info('Mercado Libre Gift Card Cancel: SUCCESS');
      return cb(null, data);
    }, (data) => {
      this.logger.error('Mercado Libre Gift Card Cancel: ' + data.message);
      return cb(data);
    });
  };
  */

  public register() {
    this.homeIntegrationsProvider.register({
      name: 'mercadolibre',
      title: 'Mercado Livre Brazil Gift Cards',
      icon: 'assets/img/mercado-libre/mercado-livre-icon.svg',
      show: !!this.configProvider.get().showIntegration['mercadolibre']
    });
  }
}
