import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as _ from 'lodash';
import { Observable, Subject } from 'rxjs';
import { from } from 'rxjs/observable/from';
import { fromPromise } from 'rxjs/observable/fromPromise';
import { of } from 'rxjs/observable/of';
import { mergeMap } from 'rxjs/operators';
import { ConfigProvider } from '../config/config';
import { EmailNotificationsProvider } from '../email-notifications/email-notifications';
import { HomeIntegrationsProvider } from '../home-integrations/home-integrations';
import { Logger } from '../logger/logger';
import {
  GiftCardMap,
  Network,
  PersistenceProvider
} from '../persistence/persistence';
import { TimeProvider } from '../time/time';
import {
  ApiBrandConfig,
  ApiCardConfig,
  AvailableCardMap,
  BaseCardConfig,
  CardBrand,
  CardConfig,
  CardName,
  GiftCard,
  GiftCardSaveParams
} from './gift-card.types';
import { offeredGiftCards } from './offered-cards';

@Injectable()
export class GiftCardProvider {
  credentials: {
    NETWORK: Network;
    BITPAY_API_URL: string;
  } = {
    NETWORK: Network.livenet,
    BITPAY_API_URL: 'https://bitpay.com'
  };

  availableCardMapPromise: Promise<AvailableCardMap>;
  cachedApiCardConfigPromise: Promise<AvailableCardMap>;

  cardUpdatesSubject: Subject<GiftCard> = new Subject<GiftCard>();
  cardUpdates$: Observable<GiftCard> = this.cardUpdatesSubject.asObservable();

  constructor(
    private configProvider: ConfigProvider,
    private emailNotificationsProvider: EmailNotificationsProvider,
    private http: HttpClient,
    private logger: Logger,
    private homeIntegrationsProvider: HomeIntegrationsProvider,
    private persistenceProvider: PersistenceProvider,
    private timeProvider: TimeProvider
  ) {
    this.logger.debug('GiftCardProvider initialized');
    this.setCredentials();
  }

  getNetwork() {
    return this.credentials.NETWORK;
  }

  setCredentials() {
    this.credentials.BITPAY_API_URL =
      this.credentials.NETWORK === Network.testnet
        ? 'https://test.bitpay.com'
        : 'https://bitpay.com';
  }

  async getCardConfig(cardName: CardName) {
    const supportedCards = await this.getSupportedCards();
    return supportedCards.find(c => c.name === cardName);
  }

  async getCardMap(cardName: CardName) {
    const network = this.getNetwork();
    const map = await this.persistenceProvider.getGiftCards(cardName, network);
    return map || {};
  }

  async getPurchasedCards(cardName: CardName): Promise<GiftCard[]> {
    const [cardConfig, giftCardMap] = await Promise.all([
      this.getCardConfig(cardName),
      this.getCardMap(cardName)
    ]);
    const invoiceIds = Object.keys(giftCardMap);
    return invoiceIds
      .map(invoiceId => giftCardMap[invoiceId] as GiftCard)
      .map(c => ({
        ...c,
        name: cardName,
        brand: cardConfig.brand,
        currency: c.currency || getCurrencyFromLegacySavedCard(cardName)
      }))
      .sort(sortByDescendingDate);
  }

  async getAllCardsOfBrand(cardBrand: CardBrand): Promise<GiftCard[]> {
    const cardConfigs = this.getOfferedCards().filter(
      cardConfig => cardConfig.brand === cardBrand
    );
    const cardPromises = cardConfigs.map(cardConfig =>
      this.getPurchasedCards(cardConfig.name)
    );
    const cardsGroup = await Promise.all(cardPromises);
    return cardsGroup
      .reduce((allCards, brandCards) => allCards.concat(brandCards), [])
      .sort(sortByDescendingDate);
  }

  async getPurchasedBrands(): Promise<GiftCard[][]> {
    const supportedCards = await this.getSupportedCards();
    const supportedCardNames = supportedCards.map(c => c.name);
    const purchasedCardPromises = supportedCardNames.map(cardName =>
      this.getPurchasedCards(cardName)
    );
    const purchasedCards = await Promise.all(purchasedCardPromises);
    return purchasedCards.filter(brand => brand.length);
  }

  async saveCard(giftCard: GiftCard, opts?: GiftCardSaveParams) {
    const oldGiftCards = await this.getCardMap(giftCard.name);
    const newMap = this.getNewSaveableGiftCardMap(oldGiftCards, giftCard, opts);
    const savePromise = this.persistCards(giftCard.name, newMap);
    await Promise.all([savePromise, this.updateActiveCards([giftCard])]);
  }

  async updateActiveCards(giftCardsToUpdate: GiftCard[]) {
    const oldActiveGiftCards: GiftCardMap = await this.persistenceProvider.getActiveGiftCards(
      this.getNetwork()
    );
    const newMap = giftCardsToUpdate.reduce(
      (updatedMap, c) =>
        this.getNewSaveableGiftCardMap(updatedMap, c, {
          remove: c.archived
        }),
      oldActiveGiftCards
    );
    return this.persistenceProvider.setActiveGiftCards(
      this.getNetwork(),
      JSON.stringify(newMap)
    );
  }

  persistCards(cardName: CardName, newMap: GiftCardMap) {
    return this.persistenceProvider.setGiftCards(
      cardName,
      this.getNetwork(),
      JSON.stringify(newMap)
    );
  }

  async saveGiftCard(giftCard: GiftCard, opts?: GiftCardSaveParams) {
    const originalCard = (await this.getPurchasedCards(giftCard.name)).find(
      c => c.invoiceId === giftCard.invoiceId
    );
    const cardChanged =
      !originalCard ||
      originalCard.status !== giftCard.status ||
      originalCard.archived !== giftCard.archived;
    const shouldNotify = cardChanged && giftCard.status !== 'UNREDEEMED';
    await this.saveCard(giftCard, opts);
    shouldNotify && this.cardUpdatesSubject.next(giftCard);
  }

  getNewSaveableGiftCardMap(oldGiftCards, gc, opts?): GiftCardMap {
    if (_.isString(oldGiftCards)) {
      oldGiftCards = JSON.parse(oldGiftCards);
    }
    if (_.isString(gc)) {
      gc = JSON.parse(gc);
    }
    let newMap = oldGiftCards || {};
    newMap[gc.invoiceId] = gc;
    if (opts && (opts.error || opts.status)) {
      newMap[gc.invoiceId] = _.assign(newMap[gc.invoiceId], opts);
    }
    if (opts && opts.remove) {
      delete newMap[gc.invoiceId];
    }
    return newMap;
  }

  async archiveCard(card: GiftCard) {
    card.archived = true;
    await this.saveGiftCard(card);
  }

  async unarchiveCard(card: GiftCard) {
    card.archived = false;
    await this.saveGiftCard(card);
  }

  async archiveAllCards(cardName: CardName) {
    const activeCards = (await this.getPurchasedCards(cardName)).filter(
      c => !c.archived
    );
    const oldGiftCards = await this.getCardMap(cardName);
    const invoiceIds = Object.keys(oldGiftCards);
    const newMap = invoiceIds.reduce((newMap, invoiceId) => {
      const card = oldGiftCards[invoiceId];
      card.archived = true;
      return this.getNewSaveableGiftCardMap(newMap, card);
    }, oldGiftCards);
    await Promise.all([
      this.persistCards(cardName, newMap),
      this.updateActiveCards(activeCards.map(c => ({ ...c, archived: true })))
    ]);
    activeCards
      .map(c => ({ ...c, archived: true }))
      .forEach(c => this.cardUpdatesSubject.next(c));
  }

  public async createGiftCard(data: GiftCard) {
    const dataSrc = {
      brand: data.name,
      clientId: data.uuid,
      invoiceId: data.invoiceId,
      accessKey: data.accessKey
    };

    const name = data.name;
    const cardConfig = await this.getCardConfig(name);

    const url = `${this.getApiPath()}/redeem`;

    return this.http
      .post(url, dataSrc)
      .catch(err => {
        this.logger.error(
          `${cardConfig.name} Gift Card Create/Update: ${err.message}`
        );
        const errMessage = err.error && err.error.message;
        const pendingMessages = [
          'Card creation delayed',
          'Invoice is unpaid or payment has not confirmed'
        ];
        return pendingMessages.indexOf(errMessage) > -1 ||
          errMessage.indexOf('Please wait') > -1
          ? of({ ...data, status: 'PENDING' })
          : Observable.throw(err);
      })
      .map((res: { claimCode?: string; claimLink?: string; pin?: string }) => {
        const status = res.claimCode || res.claimLink ? 'SUCCESS' : 'PENDING';
        const fullCard = {
          ...data,
          ...res,
          name,
          status
        };
        this.logger.info(
          `${cardConfig.name} Gift Card Create/Update: ${fullCard.status}`
        );
        return fullCard;
      })
      .toPromise();
  }

  updatePendingGiftCards(cards: GiftCard[]): Observable<GiftCard> {
    const cardsNeedingUpdate = cards.filter(card =>
      this.checkIfCardNeedsUpdate(card)
    );
    from(cardsNeedingUpdate)
      .pipe(
        mergeMap(card =>
          fromPromise(this.createGiftCard(card)).catch(err => {
            this.logger.error('Error creating gift card:', err);
            return of({ ...card, status: 'FAILURE' });
          })
        ),
        mergeMap(card =>
          card.status === 'UNREDEEMED' || card.status === 'PENDING'
            ? fromPromise(
                this.getBitPayInvoice(card.invoiceId).then(invoice => ({
                  ...card,
                  status:
                    (card.status === 'PENDING' ||
                      (card.status === 'UNREDEEMED' &&
                        invoice.status !== 'new')) &&
                    invoice.status !== 'expired'
                      ? 'PENDING'
                      : 'expired'
                }))
              )
            : of(card)
        ),
        mergeMap(updatedCard => this.updatePreviouslyPendingCard(updatedCard))
      )
      .subscribe(_ => this.logger.debug('Gift card updated'));
    return this.cardUpdates$;
  }

  updatePreviouslyPendingCard(updatedCard: GiftCard) {
    return fromPromise(
      this.saveGiftCard(updatedCard, {
        remove: updatedCard.status === 'expired'
      })
    );
  }

  async createBitpayInvoice(data) {
    const dataSrc = {
      brand: data.cardName,
      currency: data.currency,
      amount: data.amount,
      clientId: data.uuid,
      email: data.email,
      transactionCurrency: data.buyerSelectedTransactionCurrency
    };
    const url = `${this.getApiPath()}/pay`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    const cardOrder = await this.http
      .post(url, dataSrc, { headers })
      .toPromise()
      .catch(err => {
        this.logger.error('BitPay Create Invoice: ERROR', JSON.stringify(data));
        throw err;
      });
    this.logger.info('BitPay Create Invoice: SUCCESS');
    return cardOrder as { accessKey: string; invoiceId: string };
  }

  public async getBitPayInvoice(id: string) {
    const res: any = await this.http
      .get(`${this.credentials.BITPAY_API_URL}/invoices/${id}`)
      .toPromise()
      .catch(err => {
        this.logger.error('BitPay Get Invoice: ERROR ' + err.error.message);
        throw err.error.message;
      });
    this.logger.info('BitPay Get Invoice: SUCCESS');
    return res.data;
  }

  private checkIfCardNeedsUpdate(card: GiftCard) {
    // Continues normal flow (update card)
    if (
      card.status === 'PENDING' ||
      card.status === 'UNREDEEMED' ||
      card.status === 'invalid' ||
      (!card.claimCode && !card.claimLink)
    ) {
      return true;
    }
    // Check if card status FAILURE for 24 hours
    if (
      card.status === 'FAILURE' &&
      this.timeProvider.withinPastDay(card.date)
    ) {
      return true;
    }
    // Success: do not update
    return false;
  }

  async getSupportedCards(): Promise<CardConfig[]> {
    const [availableCards, cachedApiCardConfig] = await Promise.all([
      this.getAvailableCards().catch(_ => [] as CardConfig[]),
      this.getCachedApiCardConfig().catch(_ => ({} as AvailableCardMap))
    ]);
    return this.getOfferedCards().map(cardConfig => ({
      ...cardConfig,
      ...(availableCards.find(c => c.name === cardConfig.name) ||
        cachedApiCardConfig[cardConfig.name])
    }));
  }

  async getActiveCards(): Promise<GiftCard[]> {
    const giftCardMap = await this.persistenceProvider.getActiveGiftCards(
      this.getNetwork()
    );
    return !giftCardMap
      ? this.migrateAndFetchActiveCards()
      : Object.keys(giftCardMap)
          .map(invoiceId => giftCardMap[invoiceId] as GiftCard)
          .sort(sortByDescendingDate);
  }

  async migrateAndFetchActiveCards(): Promise<GiftCard[]> {
    const purchasedBrands = await this.getPurchasedBrands();
    const activeCardsGroupedByBrand = purchasedBrands.filter(
      cards => cards.filter(c => !c.archived).length
    );
    const activeCards = activeCardsGroupedByBrand
      .reduce(
        (allCards, brandCards) => [...allCards, ...brandCards],
        [] as GiftCard[]
      )
      .filter(c => !c.archived);
    await this.updateActiveCards(activeCards);
    return activeCards;
  }

  async fetchAvailableCardMap() {
    const url = `${this.credentials.BITPAY_API_URL}/gift-cards/cards`;
    const availableCardMapStub = {
      'Amazon.com': [
        {
          currency: 'USD',
          maxAmount: 2000,
          minAmount: 1,
          terms:
            'Amazon.com is not a sponsor of this promotion. Except as required by law,\nAmazon.com Gift Cards ("GCs") cannot be transferred for value or redeemed for cash. GCs may be used only for purchases\nof eligible goods at Amazon.com or certain of its affiliated websites.\n\nFor complete terms and conditions, see\nwww.amazon.com/gc-legal. GCs are issued by ACI Gift Cards, Inc., a Washington corporation. All Amazon &reg;, &trade;\n&amp; &copy; are IP of Amazon.com, Inc. or its affiliates.'
        }
      ],
      'Amazon.co.jp': [
        {
          currency: 'JPY',
          maxAmount: 200000,
          minAmount: 100,
          terms:
            '\n* Amazon Gift Cards Japan 株式会社 (「当社」) が発行するAmazonギフト券 (「ギフト券」)のご利用には、\nAmazon.co.jp (PC・モバイルを含み「アマゾンサイト」)\nのアカウント作成が必要です。ギフト券は、アマゾンサイトでのみご利用できますが、他のギフト券の購入又は一部の会費の支払等には利用できません。このギフト券の有効期限は発行日から10年間です。ギフト券の換金・返金等はできません。当社及び当社の関連会社は、ギフト券の紛失・盗難等について一切責任を負いません。ギフト券に関するお問合せは、カスタマーサービス(℡0120-999-373東京都目黒区下目黒1-8-1)までお願いします。詳細は、細則\n(www.amazon.co.jp/giftcard/tc)　をご覧下さい。\n\n* To use Amazon.co.jp gift cards ("Gift Card" or "Gift Cards")\nissued by Amazon Gift Cards Japan K.K. ("Amazon GC"), you need\nto create an account on http://www.amazon.co.jp (including PC and mobile sites.\n"Amazon Sites"). Gift Cards can only be redeemed through\nAmazon Sites, but cannot be used to purchase other Gift Cards or to pay certain membership fee available at Amazon Sites.\nGift Card balance will expire at 11:59 p.m. (Japan Time) of the date specified as expiration date on each Gift Card.\nGift Cards are non-refundable and non-exchangeable. Gift Card cannot be resold or transferred for value. Amazon GC or\nits affiliates are not responsible if Gift Card is lost, stolen, destroyed or used without your permission. If you want\nto know your Gift Card balance, expiration date or have any other questions regarding Gift Cards, please call Customer\nService (TEL: 0120-999-373, Address: 1-8-1 Shimomeguro, Meguro-ku, Tokyo 153-0064, Japan). For more information, please\nread the full Terms and Conditions of Gift Cards (http://www.amazon.co.jp/giftcard/tc)'
        }
      ],
      'Venue USD': [],
      'Barnes & Noble': [
        {
          currency: 'USD',
          cardImage: 'https://app.giftango.com/GPCGraphics/CIR_000001_03.png',
          terms:
            'Terms and Conditions\nBarnes & Noble eGift Cards can be used at any Barnes & Noble store nationwide and at BN.com (www.bn.com). They can also be used at any Barnes & Noble College location. Maintenance, dormancy or service fees do not apply to balances on eGift Cards. Barnes & Noble eGift Cards have no expiration dates. They may be used to purchase annual memberships in the Barnes & Noble Membership program (continuous billing memberships require a valid credit card).   Barnes & Noble eGift Cards will not be replaced if lost or stolen.  Barnes & Noble eGift Cards will not be exchangeable for cash except where required by law.  Barnes & Noble eGift Cards are issued by Barnes & Noble Marketing Services LLC.  Other conditions may apply.',
          redeemInstructions:
            'Redemption Instructions\nIN STORE:\nTo redeem your eGift Card from a mobile device display the barcode, eGift Card number, and associated PIN to the cashier at the time of purchase.\nONLINE:\nBrowse BN.com to find the items you wish to buy and add them to your Bag. On the Shopping Bag page, click Checkout. Enter the eGift Card number and PIN on the Payment Page during Checkout. (Please note: If the balance available on your Barnes & Noble eGift Card is less than the total cost of your order, you will be asked to provide additional eGift Cards or credit card information as payment via PayPal, or select Pay by Phone.)\nGift Cards and eGift Cards are subject to the Barnes & Noble Gift Card Terms and Conditions.',
          description:
            'Choose from an unmatched selection of books, NOOK Devices, NOOK Books™, CDs, DVDs, toys, games, and more. Good at all BN stores, BN College Booksellers LLC, and online at BN.COM',
          type: 'range',
          maxAmount: 500,
          minAmount: 5
        }
      ],
      'Bass Pro Shops': [
        {
          currency: 'USD',
          cardImage: 'https://app.giftango.com/GPCGraphics/CIR_000123_00.png',
          terms:
            '**PROTECT THIS CARD LIKE CASH.**\n\nFor customer service or balance inquiries, visit www.basspro.com/balance, see any cashier, or call 1-800-494-1100. This Gift Card is redeemable for merchandise, food and beverages only at Bass Pro Shops stores, restaurants, or catalogs; online at basspro.com or big-cedar.com; or at Bass Pro resorts (Big Cypress, Big Cedar, Top of the Rock or Buffalo Ridge). Except as required by law, this card is not redeemable or exchangeable for cash, check, or credit. This Card is not a credit or debit card and is not reloadable. This Card does not expire and is valid until redeemed. The Card issuer is BPIP, LLC. All rights reserved. Purchase or use of this card constitutes acceptance of the Bass Pro Shops Gift Card Terms & Conditions, found at www.basspro.com/giftcardterms, including binding arbitration and your waiver of rights to participate in a class action against Bass Pro Shops.',
          redeemInstructions:
            'Redemption Instructions:\n\nRecipient:\nTo redeem your eGift Card from a mobile device display the Gift Card Number and associated PIN (if applicable) to the cashier at the time of purchase. \n\nCashier:\nHand Key the Gift Card number and associated PIN (if applicable) into the POS.',
          description:
            'Bass Pro Shops® is an outdoorsman’s dream. The selection of quality outdoor gear available from Bass Pro Shops® is second to none. Everything an outdoor enthusiast could need or want is here- from the best of national brands, to local favorites, to a large offering of quality “house brands” specialty items designed by the best outdoorsmen in the business.',
          type: 'range',
          maxAmount: 500,
          minAmount: 5
        }
      ],
      'BURGER KING': [
        {
          currency: 'USD',
          cardImage: 'https://app.giftango.com/GPCGraphics/CIR_000238_02.png',
          terms: 'Not redeemable for cash.',
          redeemInstructions:
            'Usage Instructions \nRecipient Print this eGift card and bring it to any Burger King location for use. To find your nearest location, click here. \n\nBK Employee or Manager Manually type the gift card ID number into the POS system. Please consult the manager and the POS provider if you’re not familiar with this process.',
          description:
            'Every day, more than 11 million guests visit BURGER KING® restaurants around the world. And they do so because our restaurants are known for serving high-quality, great-tasting, and affordable food. Founded in 1954, BURGER KING® is the second largest fast food hamburger chain in the world. The original HOME OF THE WHOPPER®, our commitment to premium ingredients, signature recipes, and family-friendly dining experiences is what has defined our brand for more than 50 successful years.',
          type: 'range',
          maxAmount: 1000,
          minAmount: 5
        }
      ],
      'Carnival Cruise Line': [
        {
          currency: 'USD',
          cardImage: 'https://app.giftango.com/GPCGraphics/CIR_000405_01.png',
          terms:
            'Terms & Conditions: \nTreat this e-card like cash. E-card recipient bears all risk of loss in the event this e-card, or its information, is lost, stolen, damaged or used without e-card holder’s permission. In no event is CCL Gifts, LLC or any parent, subsidiary or affiliate responsible or required to replace any e-card value. Card cannot be redeemed for cash unless required by law. Complete terms and conditions available at carnival.com/giftcardterms. Use of this e-card constitutes acceptance of these terms and conditions. This e-card does not expire. Digital gift card is non-refundable and will not be replaced if lost, stolen or destroyed. © 2012 Carnival Cruise Lines. All rights reserved. Bottom of Form Ships’ Registry: The Bahamas, Panama and Malta',
          redeemInstructions:
            'Carnival Gift Cards can be used on almost anything: towards the purchase of a Carnival cruise, activities/shore excursions, and redeemed onboard toward the Sail & Sign account for gifts, drinks, and fun. \n\nRedemption Instructions: \nTo redeem towards the purchase of a Carnival cruise, call 1-800-Carnival or book online at www.carnival.com.\n\nTo redeem towards activities/shore excursions or onboard gifts, drinks and fun, print and bring this e-card to the Guest Services Desk on board your cruise ship so it can be credited towards your Sail & Sign account.',
          description:
            "Carnival Cruise Lines, a unit of Carnival Corporation is “The World’s Most Popular Cruise Line®,” with 24 “Fun Ships” operating three- to 16-day voyages to The Bahamas, Caribbean, Mexican Riviera, Alaska, Hawaii, Panama Canal, Canada, New England, Bermuda, Europe, the Pacific Islands and New Zealand.. Sharing a passion to please each guest and a commitment to quality and value, Carnival inspires people to discover their best vacation experience by offering a variety of exciting and enriching cruises to the world's most desirable destinations.",
          type: 'range',
          maxAmount: 1000,
          minAmount: 100
        }
      ],
      'Delta Air Lines': [
        {
          currency: 'USD',
          cardImage:
            'https://app.giftango.com/GPCGraphics/Delta_NoDenom_DIG_CR80_071218_300x190_RGB.png',
          terms:
            'Terms and Conditions\n•\tTo redeem or check balance, visit delta.com/redeem and enter your gift card information.\n•\teGifts and Cards may only be used for the total purchase price of air transportation, including taxes, fees, and surcharges imposed on the air transportation. They may not be used for any additional fees (including baggage fees) or for any other products or services (including class upgrades, in-flight purchases, premium seating, mileage booster, SkyMiles Cruises, cargo, hotel stays, or car rentals).\n•\teGifts and Cards may only be used for travel on Delta Air Lines marketed flights, including those operated as Delta Connection® and by Delta Air Lines codeshare partners with a Delta Air Lines flight number.\n•\teGifts and Cards may only be used for the Delta Air Lines air transportation portion of a Delta Vacations package.\n•\teGifts and Cards can be issued only in U.S. dollars ("USD"). If an eGift or a Card is used for the purchase of a ticket issued in a currency other than USD, the full value of the eGift or Card will be converted to that currency using the Bankers Rate of Exchange in effect on the date of ticket issuance, and the rate of exchange will be indicated on the ticket.\n•\tTickets purchased using eGifts and Cards are subject to the applicable Delta Air Lines Contract of Carriage and fare rules (including change penalties).\n•\tIf redeemed at www.delta.com, a maximum of three eGifts or Cards can be applied towards a single transaction, regardless of the number of tickets purchased as part of that transaction.\n•\teGifts and Cards are not reloadable and do not expire. No service or inactivity fees apply.\n•\teGifts and Cards, including those that are lost, stolen, or destroyed, will not be replaced by Delta for any reason.\n•\teGifts and Cards are not credit, debit or charge cards, and have no implied warranties.\n•\teGifts and Cards are not refundable and cannot be redeemed or exchanged for cash, check or credit except where refund or redemption is required by law.\n•\tYou may not use a Gift Card to purchase other Gift Cards.\n•\tVoid if reloaded, resold, transferred for value, or redeemed for cash.\n•\tUnused Gift Cards may not be transferred. \n•\tWhere eGifts or Cards are redeemed for a ticket, but travel is not taken, the value of the redeemed ticket (after any applicable penalties) will be provided in accordance with Delta Air Lines\' standard policy regarding ticket refunds.\n•\teGifts and Cards may only be sold by Delta and Delta-licensed vendors. eGifts and Cards that are for sale or sold by an unlicensed vendor are subject to confiscation or voiding by Delta.\n•\teGifts and Cards that are altered or obtained fraudulently are subject to confiscation or voiding by Delta.\n•\tDelta is not responsible for eGifts or Cards that are undeliverable or not received due to inaccurate delivery information provided by the purchaser.\n•\tDelta reserves the right to refuse, cancel or hold for review transactions initiated using eGifts or Cards for suspected fraud, incorrect certificate or card denomination, or violations of these terms and conditions.\n•\tDelta may at any time and without notice change these terms and conditions or contract with a third party to administer the eGift program or the Card program.\n•\tUse of eGifts and Cards is subject to applicable law. In the event of a conflict between these terms and conditions and applicable law, applicable law will govern.\n•\tThe laws of the state of Georgia, without regard to its conflicts of law provisions, apply to these Terms and Conditions and use of any eGift or Card.\n•\tDelta and its affiliates make no warranties, express or implied, with respect to eGifts and Cards, including any express or implied warranty of merchantability or fitness for a particular purpose.\n•\teGifts and Cards are issued by Delta Gift Cards, Inc. ("Delta"), an affiliate of Delta Air Lines, Inc., that is authorized to issue eGifts and Cards for sale by Delta and Delta-licensed vendors to be used toward the total purchase price of air transportation on Delta Air Lines marketed flights.',
          redeemInstructions:
            'Online Redemption Instructions\nSimply enter the Gift Card Number and Redemption Code displayed on this eGift Card when booking at Delta.com.\n\nDelta Ticketing Counter & Mobile Redemption Instructions\nTo redeem your eGift Card in person or from a mobile device, display the Gift Card Number and associated Redemption Code to a Delta customer service agent at the time of purchase. \n\nDelta Customer Service Agent:\nHand key the Gift Card Number and associated Redemption Code (if applicable) into the POS.\n \nTo Redeem by Phone\nCall Delta Air Lines Reservations and advise the agent that you are redeeming a Delta eGift. \n•\tU.S. & Canada: 800-221-1212 or 800-225-2525\n•\tJapan: 0570-077733 or 0476-31-8000\n•\tIn all other countries, call the local Delta Air Lines Reservations office. This method of redemption may result in direct ticketing charges.\n•\tCall Delta Vacations at 800-800-1504. (Travel agents, call 800-727-1111.)\n\nThe eGift Card Number and Redemption Code, located on the Delta eGift Card certificate, are required for redemption.',
          description:
            'Give the Gift of Go.TM With over 300 destinations and limitless adventures to choose from, the Delta Gift Card opens up a world of possibilities. Delta Gift Cards can be used toward airfare on any Delta marketed flight through www.delta.com, at the airport, through reservations, or by phone with Delta Vacations®. Delta Gift Cards do not have any expiration dates or fees.',
          type: 'fixed',
          amount: 100
        },
        {
          currency: 'USD',
          cardImage:
            'https://app.giftango.com/GPCGraphics/Delta_NoDenom_DIG_CR80_071218_300x190_RGB.png',
          terms:
            'Terms and Conditions\n•\tTo redeem or check balance, visit delta.com/redeem and enter your gift card information.\n•\teGifts and Cards may only be used for the total purchase price of air transportation, including taxes, fees, and surcharges imposed on the air transportation. They may not be used for any additional fees (including baggage fees) or for any other products or services (including class upgrades, in-flight purchases, premium seating, mileage booster, SkyMiles Cruises, cargo, hotel stays, or car rentals).\n•\teGifts and Cards may only be used for travel on Delta Air Lines marketed flights, including those operated as Delta Connection® and by Delta Air Lines codeshare partners with a Delta Air Lines flight number.\n•\teGifts and Cards may only be used for the Delta Air Lines air transportation portion of a Delta Vacations package.\n•\teGifts and Cards can be issued only in U.S. dollars ("USD"). If an eGift or a Card is used for the purchase of a ticket issued in a currency other than USD, the full value of the eGift or Card will be converted to that currency using the Bankers Rate of Exchange in effect on the date of ticket issuance, and the rate of exchange will be indicated on the ticket.\n•\tTickets purchased using eGifts and Cards are subject to the applicable Delta Air Lines Contract of Carriage and fare rules (including change penalties).\n•\tIf redeemed at www.delta.com, a maximum of three eGifts or Cards can be applied towards a single transaction, regardless of the number of tickets purchased as part of that transaction.\n•\teGifts and Cards are not reloadable and do not expire. No service or inactivity fees apply.\n•\teGifts and Cards, including those that are lost, stolen, or destroyed, will not be replaced by Delta for any reason.\n•\teGifts and Cards are not credit, debit or charge cards, and have no implied warranties.\n•\teGifts and Cards are not refundable and cannot be redeemed or exchanged for cash, check or credit except where refund or redemption is required by law.\n•\tYou may not use a Gift Card to purchase other Gift Cards.\n•\tVoid if reloaded, resold, transferred for value, or redeemed for cash.\n•\tUnused Gift Cards may not be transferred. \n•\tWhere eGifts or Cards are redeemed for a ticket, but travel is not taken, the value of the redeemed ticket (after any applicable penalties) will be provided in accordance with Delta Air Lines\' standard policy regarding ticket refunds.\n•\teGifts and Cards may only be sold by Delta and Delta-licensed vendors. eGifts and Cards that are for sale or sold by an unlicensed vendor are subject to confiscation or voiding by Delta.\n•\teGifts and Cards that are altered or obtained fraudulently are subject to confiscation or voiding by Delta.\n•\tDelta is not responsible for eGifts or Cards that are undeliverable or not received due to inaccurate delivery information provided by the purchaser.\n•\tDelta reserves the right to refuse, cancel or hold for review transactions initiated using eGifts or Cards for suspected fraud, incorrect certificate or card denomination, or violations of these terms and conditions.\n•\tDelta may at any time and without notice change these terms and conditions or contract with a third party to administer the eGift program or the Card program.\n•\tUse of eGifts and Cards is subject to applicable law. In the event of a conflict between these terms and conditions and applicable law, applicable law will govern.\n•\tThe laws of the state of Georgia, without regard to its conflicts of law provisions, apply to these Terms and Conditions and use of any eGift or Card.\n•\tDelta and its affiliates make no warranties, express or implied, with respect to eGifts and Cards, including any express or implied warranty of merchantability or fitness for a particular purpose.\n•\teGifts and Cards are issued by Delta Gift Cards, Inc. ("Delta"), an affiliate of Delta Air Lines, Inc., that is authorized to issue eGifts and Cards for sale by Delta and Delta-licensed vendors to be used toward the total purchase price of air transportation on Delta Air Lines marketed flights.',
          redeemInstructions:
            'Online Redemption Instructions\nSimply enter the Gift Card Number and Redemption Code displayed on this eGift Card when booking at Delta.com.\n\nDelta Ticketing Counter & Mobile Redemption Instructions\nTo redeem your eGift Card in person or from a mobile device, display the Gift Card Number and associated Redemption Code to a Delta customer service agent at the time of purchase. \n\nDelta Customer Service Agent:\nHand key the Gift Card Number and associated Redemption Code (if applicable) into the POS.\n \nTo Redeem by Phone\nCall Delta Air Lines Reservations and advise the agent that you are redeeming a Delta eGift. \n•\tU.S. & Canada: 800-221-1212 or 800-225-2525\n•\tJapan: 0570-077733 or 0476-31-8000\n•\tIn all other countries, call the local Delta Air Lines Reservations office. This method of redemption may result in direct ticketing charges.\n•\tCall Delta Vacations at 800-800-1504. (Travel agents, call 800-727-1111.)\n\nThe eGift Card Number and Redemption Code, located on the Delta eGift Card certificate, are required for redemption.',
          description:
            'Give the Gift of Go.TM With over 300 destinations and limitless adventures to choose from, the Delta Gift Card opens up a world of possibilities. Delta Gift Cards can be used toward airfare on any Delta marketed flight through www.delta.com, at the airport, through reservations, or by phone with Delta Vacations®. Delta Gift Cards do not have any expiration dates or fees.',
          type: 'fixed',
          amount: 250
        },
        {
          currency: 'USD',
          cardImage:
            'https://app.giftango.com/GPCGraphics/Delta_NoDenom_DIG_CR80_071218_300x190_RGB.png',
          terms:
            'Terms and Conditions\n•\tTo redeem or check balance, visit delta.com/redeem and enter your gift card information.\n•\teGifts and Cards may only be used for the total purchase price of air transportation, including taxes, fees, and surcharges imposed on the air transportation. They may not be used for any additional fees (including baggage fees) or for any other products or services (including class upgrades, in-flight purchases, premium seating, mileage booster, SkyMiles Cruises, cargo, hotel stays, or car rentals).\n•\teGifts and Cards may only be used for travel on Delta Air Lines marketed flights, including those operated as Delta Connection® and by Delta Air Lines codeshare partners with a Delta Air Lines flight number.\n•\teGifts and Cards may only be used for the Delta Air Lines air transportation portion of a Delta Vacations package.\n•\teGifts and Cards can be issued only in U.S. dollars ("USD"). If an eGift or a Card is used for the purchase of a ticket issued in a currency other than USD, the full value of the eGift or Card will be converted to that currency using the Bankers Rate of Exchange in effect on the date of ticket issuance, and the rate of exchange will be indicated on the ticket.\n•\tTickets purchased using eGifts and Cards are subject to the applicable Delta Air Lines Contract of Carriage and fare rules (including change penalties).\n•\tIf redeemed at www.delta.com, a maximum of three eGifts or Cards can be applied towards a single transaction, regardless of the number of tickets purchased as part of that transaction.\n•\teGifts and Cards are not reloadable and do not expire. No service or inactivity fees apply.\n•\teGifts and Cards, including those that are lost, stolen, or destroyed, will not be replaced by Delta for any reason.\n•\teGifts and Cards are not credit, debit or charge cards, and have no implied warranties.\n•\teGifts and Cards are not refundable and cannot be redeemed or exchanged for cash, check or credit except where refund or redemption is required by law.\n•\tYou may not use a Gift Card to purchase other Gift Cards.\n•\tVoid if reloaded, resold, transferred for value, or redeemed for cash.\n•\tUnused Gift Cards may not be transferred. \n•\tWhere eGifts or Cards are redeemed for a ticket, but travel is not taken, the value of the redeemed ticket (after any applicable penalties) will be provided in accordance with Delta Air Lines\' standard policy regarding ticket refunds.\n•\teGifts and Cards may only be sold by Delta and Delta-licensed vendors. eGifts and Cards that are for sale or sold by an unlicensed vendor are subject to confiscation or voiding by Delta.\n•\teGifts and Cards that are altered or obtained fraudulently are subject to confiscation or voiding by Delta.\n•\tDelta is not responsible for eGifts or Cards that are undeliverable or not received due to inaccurate delivery information provided by the purchaser.\n•\tDelta reserves the right to refuse, cancel or hold for review transactions initiated using eGifts or Cards for suspected fraud, incorrect certificate or card denomination, or violations of these terms and conditions.\n•\tDelta may at any time and without notice change these terms and conditions or contract with a third party to administer the eGift program or the Card program.\n•\tUse of eGifts and Cards is subject to applicable law. In the event of a conflict between these terms and conditions and applicable law, applicable law will govern.\n•\tThe laws of the state of Georgia, without regard to its conflicts of law provisions, apply to these Terms and Conditions and use of any eGift or Card.\n•\tDelta and its affiliates make no warranties, express or implied, with respect to eGifts and Cards, including any express or implied warranty of merchantability or fitness for a particular purpose.\n•\teGifts and Cards are issued by Delta Gift Cards, Inc. ("Delta"), an affiliate of Delta Air Lines, Inc., that is authorized to issue eGifts and Cards for sale by Delta and Delta-licensed vendors to be used toward the total purchase price of air transportation on Delta Air Lines marketed flights.',
          redeemInstructions:
            'Online Redemption Instructions\nSimply enter the Gift Card Number and Redemption Code displayed on this eGift Card when booking at Delta.com.\n\nDelta Ticketing Counter & Mobile Redemption Instructions\nTo redeem your eGift Card in person or from a mobile device, display the Gift Card Number and associated Redemption Code to a Delta customer service agent at the time of purchase. \n\nDelta Customer Service Agent:\nHand key the Gift Card Number and associated Redemption Code (if applicable) into the POS.\n \nTo Redeem by Phone\nCall Delta Air Lines Reservations and advise the agent that you are redeeming a Delta eGift. \n•\tU.S. & Canada: 800-221-1212 or 800-225-2525\n•\tJapan: 0570-077733 or 0476-31-8000\n•\tIn all other countries, call the local Delta Air Lines Reservations office. This method of redemption may result in direct ticketing charges.\n•\tCall Delta Vacations at 800-800-1504. (Travel agents, call 800-727-1111.)\n\nThe eGift Card Number and Redemption Code, located on the Delta eGift Card certificate, are required for redemption.',
          description:
            'Give the Gift of Go.TM With over 300 destinations and limitless adventures to choose from, the Delta Gift Card opens up a world of possibilities. Delta Gift Cards can be used toward airfare on any Delta marketed flight through www.delta.com, at the airport, through reservations, or by phone with Delta Vacations®. Delta Gift Cards do not have any expiration dates or fees.',
          type: 'fixed',
          amount: 50
        },
        {
          currency: 'USD',
          cardImage:
            'https://app.giftango.com/GPCGraphics/Delta_NoDenom_DIG_CR80_071218_300x190_RGB.png',
          terms:
            'Terms and Conditions\n•\tTo redeem or check balance, visit delta.com/redeem and enter your gift card information.\n•\teGifts and Cards may only be used for the total purchase price of air transportation, including taxes, fees, and surcharges imposed on the air transportation. They may not be used for any additional fees (including baggage fees) or for any other products or services (including class upgrades, in-flight purchases, premium seating, mileage booster, SkyMiles Cruises, cargo, hotel stays, or car rentals).\n•\teGifts and Cards may only be used for travel on Delta Air Lines marketed flights, including those operated as Delta Connection® and by Delta Air Lines codeshare partners with a Delta Air Lines flight number.\n•\teGifts and Cards may only be used for the Delta Air Lines air transportation portion of a Delta Vacations package.\n•\teGifts and Cards can be issued only in U.S. dollars ("USD"). If an eGift or a Card is used for the purchase of a ticket issued in a currency other than USD, the full value of the eGift or Card will be converted to that currency using the Bankers Rate of Exchange in effect on the date of ticket issuance, and the rate of exchange will be indicated on the ticket.\n•\tTickets purchased using eGifts and Cards are subject to the applicable Delta Air Lines Contract of Carriage and fare rules (including change penalties).\n•\tIf redeemed at www.delta.com, a maximum of three eGifts or Cards can be applied towards a single transaction, regardless of the number of tickets purchased as part of that transaction.\n•\teGifts and Cards are not reloadable and do not expire. No service or inactivity fees apply.\n•\teGifts and Cards, including those that are lost, stolen, or destroyed, will not be replaced by Delta for any reason.\n•\teGifts and Cards are not credit, debit or charge cards, and have no implied warranties.\n•\teGifts and Cards are not refundable and cannot be redeemed or exchanged for cash, check or credit except where refund or redemption is required by law.\n•\tYou may not use a Gift Card to purchase other Gift Cards.\n•\tVoid if reloaded, resold, transferred for value, or redeemed for cash.\n•\tUnused Gift Cards may not be transferred. \n•\tWhere eGifts or Cards are redeemed for a ticket, but travel is not taken, the value of the redeemed ticket (after any applicable penalties) will be provided in accordance with Delta Air Lines\' standard policy regarding ticket refunds.\n•\teGifts and Cards may only be sold by Delta and Delta-licensed vendors. eGifts and Cards that are for sale or sold by an unlicensed vendor are subject to confiscation or voiding by Delta.\n•\teGifts and Cards that are altered or obtained fraudulently are subject to confiscation or voiding by Delta.\n•\tDelta is not responsible for eGifts or Cards that are undeliverable or not received due to inaccurate delivery information provided by the purchaser.\n•\tDelta reserves the right to refuse, cancel or hold for review transactions initiated using eGifts or Cards for suspected fraud, incorrect certificate or card denomination, or violations of these terms and conditions.\n•\tDelta may at any time and without notice change these terms and conditions or contract with a third party to administer the eGift program or the Card program.\n•\tUse of eGifts and Cards is subject to applicable law. In the event of a conflict between these terms and conditions and applicable law, applicable law will govern.\n•\tThe laws of the state of Georgia, without regard to its conflicts of law provisions, apply to these Terms and Conditions and use of any eGift or Card.\n•\tDelta and its affiliates make no warranties, express or implied, with respect to eGifts and Cards, including any express or implied warranty of merchantability or fitness for a particular purpose.\n•\teGifts and Cards are issued by Delta Gift Cards, Inc. ("Delta"), an affiliate of Delta Air Lines, Inc., that is authorized to issue eGifts and Cards for sale by Delta and Delta-licensed vendors to be used toward the total purchase price of air transportation on Delta Air Lines marketed flights.',
          redeemInstructions:
            'Online Redemption Instructions\nSimply enter the Gift Card Number and Redemption Code displayed on this eGift Card when booking at Delta.com.\n\nDelta Ticketing Counter & Mobile Redemption Instructions\nTo redeem your eGift Card in person or from a mobile device, display the Gift Card Number and associated Redemption Code to a Delta customer service agent at the time of purchase. \n\nDelta Customer Service Agent:\nHand key the Gift Card Number and associated Redemption Code (if applicable) into the POS.\n \nTo Redeem by Phone\nCall Delta Air Lines Reservations and advise the agent that you are redeeming a Delta eGift. \n•\tU.S. & Canada: 800-221-1212 or 800-225-2525\n•\tJapan: 0570-077733 or 0476-31-8000\n•\tIn all other countries, call the local Delta Air Lines Reservations office. This method of redemption may result in direct ticketing charges.\n•\tCall Delta Vacations at 800-800-1504. (Travel agents, call 800-727-1111.)\n\nThe eGift Card Number and Redemption Code, located on the Delta eGift Card certificate, are required for redemption.',
          description:
            'Give the Gift of Go.TM With over 300 destinations and limitless adventures to choose from, the Delta Gift Card opens up a world of possibilities. Delta Gift Cards can be used toward airfare on any Delta marketed flight through www.delta.com, at the airport, through reservations, or by phone with Delta Vacations®. Delta Gift Cards do not have any expiration dates or fees.',
          type: 'fixed',
          amount: 500
        }
      ],
      DSW: [
        {
          currency: 'USD',
          cardImage: 'https://app.giftango.com/GPCGraphics/CIR_000822_00.png',
          terms:
            'Terms and Conditions\nTo check card balance, go to dsw.com, visit any DSW store or call 1.888.895.2504. This card is redeemable for merchandise only from DSW retail stores or online at dsw.com. This card may not be used at DSW Canada stores, at www.dswcanada.ca, for the purchase of gift cards or redeemed for cash unless otherwise required by applicable law.  If lost or stolen, this card will not be replaced without the original sales receipt. Replacement value will be the value of this card at the time loss or theft reported.  No expiration date. Use of this card constitutes your acceptance of these terms and conditions, which are governed by the laws of the state where this card was purchased. This card is issued by Brand Card Services, LLC. DSW customer service: 1.866.DSW.SHOES (1.866.379.7463).',
          redeemInstructions:
            'To Redeem Online\nEnter the DSW eGift card number and PIN during online checkout at dsw.com.\n\nTo Redeem In-Store\nPrint this page and show it to the cashier during checkout.\nIn-Store Mobile Redemption Instructions\nRecipient:\nTo redeem your eGift Card from a mobile device display the gift card number and associated PIN (if applicable) to the cashier at the time of purchase. \n\nCashier:\nHand key the gift card number and associated PIN (if applicable) into the POS.',
          description:
            'DSW Designer Shoe Warehouse is the destination for major brands at incredible prices. With thousands of styles for the whole family, free shipping options, and a very rewarding loyalty program, DSW makes it easy to get what you want without spending a ton.',
          type: 'range',
          maxAmount: 500,
          minAmount: 5
        }
      ],
      'Google Play': [
        {
          currency: 'USD',
          cardImage:
            'https://app.giftango.com/GPCGraphics/GooglePlay_NoDenom_CR80_090117_300x190_RGB.png',
          terms:
            'See play.google.com/us-card-terms for full terms. Must be 13+ years of age, US resident. Requires Google Payments account and internet access to redeem. Usable for purchases of eligible items on Google Play only. Not usable for hardware and certain subscriptions. Other limits may apply. No fees or expiration dates. Except as required by law, card is not redeemable for cash or other cards, not reloadable or refundable, cannot be combined with other non-Google Play balances in your Google Payment account, resold, exchanged or transferred for value. User responsible for loss of card. For assistance or to view your Google Play card balance, visit support.google.com/googleplay/go/cardhelp. To speak to customer care call us at 1-855-466-4438. Issued by Google Payment Corp.',
          redeemInstructions:
            'To redeem in the Play Store:\n1. On your Android phone or tablet, open the Play Store app. Tap the menu icon and select Redeem. On your laptop, go to play.google.com/redeem.\n2. Enter gift code.\n3. Start shopping! Your gift code value will be added to your Google Play balance.',
          description:
            "Power up in over 1M Android apps and games on Google Play, the world's largest mobile gaming platform. Use a Google Play gift code to go further in your favorite games like Clash Royale or Pokemon Go or redeem your code for the latest apps, movies, music, books, and more. There’s no credit card required, and balances never expire. Treat yourself or give the gift of Play today.",
          type: 'range',
          maxAmount: 500,
          minAmount: 10
        }
      ],
      'Home Depot': [
        {
          currency: 'USD',
          cardImage: 'https://app.giftango.com/GPCGraphics/CIR_000035_00.png',
          terms:
            'Terms and Conditions\nGift Card is valid for the purchase of merchandise/services at any The Home Depot® store in the U.S., Canada and online at HomeDepot.com. Gift Card is not a credit/debit card and is not redeemable for cash or credit unless required by law. Gift Card cannot be applied to any credit or loan balance, Tool Rental Deposits, or for in-home purchases. To replace a lost or stolen Gift Card, visit your local store. Lost, stolen or damaged Gift Cards will not be replaced without proof of purchase. Replacement value is the value of the Gift Card at the time it is reported lost or stolen. Gift Cards purchased with cash will not be replaced unless required by law. Returns for purchases made with this Gift Card are subject to The Home Depot’s Returns Policy (details available at any The Home Depot store) and eligible refunds will be issued in store credit. Gift Card may be deactivated or rejected if fraud is suspected in the issuer’s sole discretion. Check your balance at any The Home Depot store or online. Reload Gift Card value at any The Home Depot store or online at HomeDepot.com. For cross-border redemptions, Gift Card is redeemable at The Home Depot’s applicable local currency exchange rate at the time of redemption. Gift Card is issued by Home Depot Incentives, Inc. \n\n© 2018 Home Depot Product Authority, LLC. All rights reserved.',
          redeemInstructions:
            'Using your eGift Card is simple:\nRedeem In Store\n1.\tOpen your eGift Card on your smartphone or print this page.\n2.\tPresent the eGift Card barcode at checkout to redeem your eGift Card at any The Home Depot store in the U.S. and Canada.\nCashier Instructions: eGift Cards should be processed in the same manner as a regular gift card tender. If the barcode does not scan, manually enter the eGift Card number.\nRedeem Online\n1.\tShop at homedepot.com online.\n2.\tAt checkout, please enter the following codes:\neGift Card: 00-0 0000 00-0 00 \nPIN: 0000\nTo check your balance or to find your nearest store location, visit www.homedepot.com.',
          description:
            'The Home Depot® is helping people do more with their hard earned money. From modest projects like updating your bath to small projects with a big impact like paint. The Home Depot can help you get more done in your home for less. That’s the power of the world’s largest home improvement retailer. The Home Depot. More saving. More doing.',
          type: 'range',
          maxAmount: 2000,
          minAmount: 5
        }
      ],
      'Hotels.com': [
        {
          currency: 'USD',
          cardImage:
            'https://app.giftango.com/GPCGraphics/Hotels.com_NoDenom_CR80_062618_300x190_RGB.png',
          terms:
            'Terms and Conditions:\nThis gift card is usable up to balance only to purchase goods or services at any Applebee’s Neighborhood Grill + Bar® in the U.S. and Canada or through applebees.com. Not usable to purchase gift cards. Card is not redeemable for cash unless required by law. Card will not be replaced or replenished if lost, stolen, damaged or used without authorization. ACM Cards, Inc. or the Franchisee of the independently owned restaurant where card was purchased is the card issuer. ACM or Franchisee may delegate its issuer obligations to an assignee. Purchase, use or acceptance of card constitutes acceptance of these terms. Inquiries, complete terms and restaurant location information: visit applebees.com or call 1-800-252-6722. ©2019 Applebee’s Restaurants LLC',
          redeemInstructions:
            'Redemption Instructions:\n1. Visit www.hotels.com/gc  \n2. Search the destination and desired dates of travel\n3. Select the hotel and room type you wish to book Select "Pay Now" if applicable\n4. Enter your eGift Card number and PIN',
          description:
            'The Hotels.com Gift Card is redeemable on bookings at over 220,000 hotels in 200 countries worldwide, ranging from international chains and all-inclusive resorts to local favorites and bed & breakfasts. Redeemable on Hotels.com, the Hotels.com Gift Card can be used in conjunction with member-only-deals and promotions. Bookings with the Hotels.com Gift Card count toward free nights with Hotels.com® Rewards where customers can earn a free* night for every 10 nights stayed. For more information visit www.hotels.com/giftcards or e-mail giftcards@hotels.com.\n\n*Subject to Hotels.com Rewards terms and conditions, as set out at www.Hotels.com.',
          type: 'range',
          maxAmount: 500,
          minAmount: 10
        }
      ],
      "Papa John's": [
        {
          currency: 'USD',
          cardImage:
            "https://app.giftango.com/GPCGraphics/PapaJohn's_NoDenom_DIG_CR80_091918_300x190_RGB.png",
          terms:
            "The amount contained on this card may be applied toward the purchase of food, beverage or a gratuity from any participating Papa John's restaurant in the U.S. Card does not expire and no fees will be charged. Each time the card is used, the purchase amount will be deducted from the card’s stored value. Verification may be required if the card is used other than by physical presentation (such as telephone or online ordering). If the card is lost, stolen, damaged, destroyed or used without your permission, it will not be replaced or replenished and you will lose any remaining value on the card. This card is not redeemable for cash, unless required by law.",
          redeemInstructions:
            "Redemption Instructions\nYou can redeem your eGift Card at any participating Papa John's restaurant in person, by phone or online at www.papajohns.com.\n\nRedeem in Restaurant\nPrint this page or present your eGift Card on phone to the Team Member taking your order.\n\nRedeem by Phone\nWhen asked for payment provide the Team Member taking your order with your 19-digit gift card number and 4-digit PIN.\n\nRedeem Online\nPlace your order at papajohns.com. At checkout, select Gift Card as the payment type and enter the 19-digit card number and 4-digit PIN when prompted.\n\nFor a gift card balance, visit papajohns.com/gift-cards or call 1-800-325-1119.\n\nIn-Store Mobile Redemption Instructions\nRecipient:\nTo redeem your eGift Card from a mobile device display the gift card number and associated PIN to the cashier at the time of purchase. \n\nCashier:\nHand key the gift card number and associated PIN into the POS.",
          description:
            "Take the guesswork out of gift giving. A Papa John’s eGift Card can be given to anyone who loves great tasting pizza! It is the perfect gift for those “hard to buy for” people on your shopping list. Papa John's eGift Cards can be redeemed at more than 3,400 participating restaurants in the U.S. Papa John's eGift Cards do not expire or have service fees.",
          type: 'range',
          maxAmount: 500,
          minAmount: 5
        }
      ],
      'Pottery Barn': [
        {
          currency: 'USD',
          cardImage:
            'https://app.giftango.com/GPCGraphics/PotteryBarn_NoDenom_DIG_CR80_071918_300x190_RGB.png',
          terms:
            'Terms and Conditions\nThis card is issued by Williams-Sonoma, Inc. and may be used for making purchases at stores in the United States & Puerto Rico, by phone or online with Williams Sonoma®, Pottery Barn®, pottery barn kids®, PBteen®, Mark and Graham® and west elm®. Treat this card like cash.  It may not be redeemed for cash or applied as payment to any account, unless required by law. Williams Sonoma does not accept responsibility for cards lost, damaged or stolen, or any unauthorized use of cards. Unauthorized resale prohibited. Acceptance of this card constitutes acceptance of these terms and conditions. Williams-Sonoma, Inc. reserves the right to change these terms and conditions at any time.  \nVisit potterybarn.com for balance inquiry, store locations, or to place an order. To place an order by phone, call 1-800-922-5507.\n© 2018 Williams-Sonoma, Inc.',
          redeemInstructions:
            'Redeeming your eGift Card is Simple:\n\n•\tRedeem In-Store: Please print your eGift card, or present your mobile device at any Pottery Barn store in the U.S.\n•\tRedeem Online: Choose your perfect gift at www.potterybarn.com. At checkout, please enter your eGift card number and PIN\n\nStore Associate Instructions:\n•\teGift cards should be processed in the same manner as a regular Gift Card tender. When prompted to swipe the Gift Card, scan the eGift card barcode or hand-key the 16-digit eGift Card number. \n•\tPlease follow all other standard policies and procedure for handling Gift Card transactions. ',
          description:
            'Pottery Barn® is a home furnishings brand for real people, real lives and real homes. We passionately infuse quality and comfort into everything we create, from furniture to decor to bed and bath essentials, so you can live a more functional, beautiful and comfortable life at home. Our Wedding Registry services make it easy to choose the perfect gift, and our Design Crew can help you with projects big and small, from design to installation. For a store near you or to request a catalog, visit potterybarn.com or call 1.800.922.5507. ',
          type: 'range',
          maxAmount: 500,
          minAmount: 25
        }
      ],
      'Royal Caribbean': [
        {
          currency: 'USD',
          cardImage:
            'https://app.giftango.com/GPCGraphics/RoyalCaribbean_NoDenom_DIG_CR80_112918_300x190_RGB.png',
          terms:
            'TERMS AND CONDITIONS: Gift Certificate must be redeemed through Royal Caribbean International for the US dollar value as outlined on the face of the certificate.\n1. Certificate must be used as a form of payment towards a new reservation made directly with Royal Caribbean. Once the gift certificate is applied to the reservation made, the reservation may be transferred to your preferred travel agency.\n2. Certificate is valid only for Royal Caribbean International sailings in USD and is not redeemable for cash. It may be applied to all ships, departures and stateroom categories.\n3. Certificate can only be applied to a NEW individual reservation in USD.\n4. Certificate may not be applied to a group reservation, charter or customized group program.\n5. Certificate may not be used towards onboard credit or to settle any shipboard charges.\n6. A deposit is required at the time of booking.\n7. Certificates may be used in multiples and may be used to supplement cash payment or credit card.\n8. All reservations are subject to availability.\n9. Once a reservation has been made with a Certificate, normal cancellation policy, schedules for deposit and final payments shall apply.\n10. Changes to the reservation may be permitted, subject to availability.\n11. Certificate is transferable only when gifted and bears no expiration date.\n12. Certificate is nonrefundable and not replaceable whether lost, stolen or if booking is cancelled.\n13. Certificate shall be void where prohibited or restricted by law and if sold for cash or other consideration.',
          redeemInstructions:
            'REDEMPTION INSTRUCTIONS:\n\nSTEP 1 Book your Royal Caribbean cruise vacation\nOnline: www.RoyalCaribbean.com\nCall: 866-504-3941\nDeposit Required at the time of reservation.\n\nIncomm Certificate Program - ID 302647\n\nSTEP 2 Redeem Certificate\nAfter making your cruise reservation, email a copy of the Gift Certificate along with your cruise reservation booking number to SharedServicesGiftCertificateRedemption@rccl.com\nThe value of the Gift Certificate will then be applied to your cruise reservation. Please allow up to 10 business days. You will be notified once certificate has been applied to your reservation.\n\nQuestions? Contact us at email address above.',
          description:
            'Royal Caribbean International is a global cruise brand with 22 innovative ships, calling on more than 270 destinations in 72 countries across six continents. Our Allure of the Seas ship is currently the largest cruise ship in the world. With exhilarating onboard activities, a variety of dining options, award-winning entertainment and endless customization options, a Royal Caribbean cruise is the ultimate vacation experience.',
          type: 'range',
          maxAmount: 2000,
          minAmount: 50
        }
      ],
      'Sony PlayStation': [
        {
          currency: 'USD',
          cardImage: 'https://app.giftango.com/GPCGraphics/CIR_000519_00.png',
          terms:
            'Terms and Conditions\nYour use of this PSNSM code (“Code”) constitutes your acceptance of these terms and any additional terms available at http://us.playstation.com/redemption. Activated Codes can only be redeemed through a Sony Entertainment Network (SEN) master account subject to prior acceptance of the SEN Terms of Service and User Agreement and applicable Privacy Policy available at http://us.playstation.com/redemption. PS4™, PS3™, PS Vita, and PSP® systems, personal computers, access to the internet, compatible hardware and software sold separately. Your account will only accept Codes from the country designated on your account. Code is not redeemable for cash, cannot be returned for cash or credit, and may not be used for any other purpose. Code will not be replaced if lost, destroyed, or stolen. Sony Computer Entertainment America LLC, its parent company, affiliated companies and licensors make no express or implied warranties with respect to Code, PSNSM or the availability of products or services. To the extent permitted by law, your sole and exclusive remedy is the replacement of Code. All rights are reserved. Terms of Code may change without notice. Void where prohibited or restricted by law. For assistance, contact http://us.playstation.com/Support.\nPlayStation, PSP and the “PS” Family Logo are registered trademarks, PS4 and PS3 are trademarks, and PSN and the PSN Logo are service marks of Sony Computer Entertainment Inc.',
          redeemInstructions:
            "Redemption Instructions\n1. Open a PlayStation Network (PSN) account (or use your existing PSN account).\n2. Select the PlayStation®Store icon on the PS4™ system home screen.\n3. On PlayStation®Store, select 'Redeem Codes' at the bottom of the menu.\n4. Enter the code.\n5. Once the code has been entered correctly, select 'Continue' on the dialog box.\n6. Select 'Continue' to complete code redemption.\n\nFor additional redemption instructions, please visit https://www.playstation.com/en-us/explore/playstationnetwork/redemption/ ",
          description:
            'Your Ultimate Entertainment Code\nDownload the latest games and add ons, watch movies, listen to music, and more.',
          type: 'fixed',
          amount: 10
        },
        {
          currency: 'USD',
          cardImage: 'https://app.giftango.com/GPCGraphics/CIR_000519_00.png',
          terms:
            'Terms and Conditions\nYour use of this PSNSM code (“Code”) constitutes your acceptance of these terms and any additional terms available at http://us.playstation.com/redemption. Activated Codes can only be redeemed through a Sony Entertainment Network (SEN) master account subject to prior acceptance of the SEN Terms of Service and User Agreement and applicable Privacy Policy available at http://us.playstation.com/redemption. PS4™, PS3™, PS Vita, and PSP® systems, personal computers, access to the internet, compatible hardware and software sold separately. Your account will only accept Codes from the country designated on your account. Code is not redeemable for cash, cannot be returned for cash or credit, and may not be used for any other purpose. Code will not be replaced if lost, destroyed, or stolen. Sony Computer Entertainment America LLC, its parent company, affiliated companies and licensors make no express or implied warranties with respect to Code, PSNSM or the availability of products or services. To the extent permitted by law, your sole and exclusive remedy is the replacement of Code. All rights are reserved. Terms of Code may change without notice. Void where prohibited or restricted by law. For assistance, contact http://us.playstation.com/Support.\nPlayStation, PSP and the “PS” Family Logo are registered trademarks, PS4 and PS3 are trademarks, and PSN and the PSN Logo are service marks of Sony Computer Entertainment Inc.',
          redeemInstructions:
            "Redemption Instructions\n1. Open a PlayStation Network (PSN) account (or use your existing PSN account).\n2. Select the PlayStation®Store icon on the PS4™ system home screen.\n3. On PlayStation®Store, select 'Redeem Codes' at the bottom of the menu.\n4. Enter the code.\n5. Once the code has been entered correctly, select 'Continue' on the dialog box.\n6. Select 'Continue' to complete code redemption.\n\nFor additional redemption instructions, please visit https://www.playstation.com/en-us/explore/playstationnetwork/redemption/ ",
          description:
            'Your Ultimate Entertainment Code\nDownload the latest games and add ons, watch movies, listen to music, and more.',
          type: 'fixed',
          amount: 100
        },
        {
          currency: 'USD',
          cardImage: 'https://app.giftango.com/GPCGraphics/CIR_000519_00.png',
          terms:
            'Terms and Conditions\nYour use of this PSNSM code (“Code”) constitutes your acceptance of these terms and any additional terms available at http://us.playstation.com/redemption. Activated Codes can only be redeemed through a Sony Entertainment Network (SEN) master account subject to prior acceptance of the SEN Terms of Service and User Agreement and applicable Privacy Policy available at http://us.playstation.com/redemption. PS4™, PS3™, PS Vita, and PSP® systems, personal computers, access to the internet, compatible hardware and software sold separately. Your account will only accept Codes from the country designated on your account. Code is not redeemable for cash, cannot be returned for cash or credit, and may not be used for any other purpose. Code will not be replaced if lost, destroyed, or stolen. Sony Computer Entertainment America LLC, its parent company, affiliated companies and licensors make no express or implied warranties with respect to Code, PSNSM or the availability of products or services. To the extent permitted by law, your sole and exclusive remedy is the replacement of Code. All rights are reserved. Terms of Code may change without notice. Void where prohibited or restricted by law. For assistance, contact http://us.playstation.com/Support.\nPlayStation, PSP and the “PS” Family Logo are registered trademarks, PS4 and PS3 are trademarks, and PSN and the PSN Logo are service marks of Sony Computer Entertainment Inc.',
          redeemInstructions:
            "Redemption Instructions\n1. Open a PlayStation Network (PSN) account (or use your existing PSN account).\n2. Select the PlayStation®Store icon on the PS4™ system home screen.\n3. On PlayStation®Store, select 'Redeem Codes' at the bottom of the menu.\n4. Enter the code.\n5. Once the code has been entered correctly, select 'Continue' on the dialog box.\n6. Select 'Continue' to complete code redemption.\n\nFor additional redemption instructions, please visit https://www.playstation.com/en-us/explore/playstationnetwork/redemption/ ",
          description:
            'Your Ultimate Entertainment Code\nDownload the latest games and add ons, watch movies, listen to music, and more.',
          type: 'fixed',
          amount: 20
        },
        {
          currency: 'USD',
          cardImage:
            'https://app.giftango.com/GPCGraphics/Sony_PlayStationPlus_NoDenom_CR80_051018_300x190_RGB.png',
          terms:
            'Terms and Conditions\nYour use of this PSNSM code (“Code”) constitutes your acceptance of these terms and any additional terms available at http://us.playstation.com/redemption. Activated Codes can only be redeemed through a Sony Entertainment Network (SEN) master account subject to prior acceptance of the SEN Terms of Service and User Agreement and applicable Privacy Policy available at http://us.playstation.com/redemption. PS4™, PS3™, PS Vita, and PSP® systems, personal computers, access to the internet, compatible hardware and software sold separately. Your account will only accept Codes from the country designated on your account. Code is not redeemable for cash, cannot be returned for cash or credit, and may not be used for any other purpose. Code will not be replaced if lost, destroyed, or stolen. Sony Computer Entertainment America LLC, its parent company, affiliated companies and licensors make no express or implied warranties with respect to Code, PSNSM or the availability of products or services. To the extent permitted by law, your sole and exclusive remedy is the replacement of Code. All rights are reserved. Terms of Code may change without notice. Void where prohibited or restricted by law. For assistance, contact http://us.playstation.com/Support.\nPlayStation, PSP and the “PS” Family Logo are registered trademarks, PS4 and PS3 are trademarks, and PSN and the PSN Logo are service marks of Sony Computer Entertainment Inc.',
          redeemInstructions:
            "Redemption Instructions\n1. Open a PlayStation Network (PSN) account (or use your existing PSN account).\n2. Select the PlayStation®Store icon on the PS4™ system home screen.\n3. On PlayStation®Store, select 'Redeem Codes' at the bottom of the menu.\n4. Enter the code.\n5. Once the code has been entered correctly, select 'Continue' on the dialog box.\n6. Select 'Continue' to complete code redemption.\n\nFor additional redemption instructions, please visit https://www.playstation.com/en-us/explore/playstationnetwork/redemption/ ",
          description:
            'Your PlayStation®Plus premium membership includes:\n•\tAccess to an ever-expanding library of hit games\n•\tOnline multiplayer on the PlayStation®4 system (you can continue to access online multiplayer on your PlayStation®3 and PlayStation®Vita systems without an active PlayStation Plus membership)\n•\tBenefits across PS4™, PS3™, and PS Vita systems',
          type: 'fixed',
          amount: 25
        },
        {
          currency: 'USD',
          cardImage: 'https://app.giftango.com/GPCGraphics/CIR_000519_00.png',
          terms:
            'Terms and Conditions\nYour use of this PSNSM code (“Code”) constitutes your acceptance of these terms and any additional terms available at http://us.playstation.com/redemption. Activated Codes can only be redeemed through a Sony Entertainment Network (SEN) master account subject to prior acceptance of the SEN Terms of Service and User Agreement and applicable Privacy Policy available at http://us.playstation.com/redemption. PS4™, PS3™, PS Vita, and PSP® systems, personal computers, access to the internet, compatible hardware and software sold separately. Your account will only accept Codes from the country designated on your account. Code is not redeemable for cash, cannot be returned for cash or credit, and may not be used for any other purpose. Code will not be replaced if lost, destroyed, or stolen. Sony Computer Entertainment America LLC, its parent company, affiliated companies and licensors make no express or implied warranties with respect to Code, PSNSM or the availability of products or services. To the extent permitted by law, your sole and exclusive remedy is the replacement of Code. All rights are reserved. Terms of Code may change without notice. Void where prohibited or restricted by law. For assistance, contact http://us.playstation.com/Support.\nPlayStation, PSP and the “PS” Family Logo are registered trademarks, PS4 and PS3 are trademarks, and PSN and the PSN Logo are service marks of Sony Computer Entertainment Inc.',
          redeemInstructions:
            "Redemption Instructions\n1. Open a PlayStation Network (PSN) account (or use your existing PSN account).\n2. Select the PlayStation®Store icon on the PS4™ system home screen.\n3. On PlayStation®Store, select 'Redeem Codes' at the bottom of the menu.\n4. Enter the code.\n5. Once the code has been entered correctly, select 'Continue' on the dialog box.\n6. Select 'Continue' to complete code redemption.\n\nFor additional redemption instructions, please visit https://www.playstation.com/en-us/explore/playstationnetwork/redemption/ ",
          description:
            'Your Ultimate Entertainment Code\nDownload the latest games and add ons, watch movies, listen to music, and more.',
          type: 'fixed',
          amount: 50
        }
      ],
      Spotify: [
        {
          currency: 'USD',
          cardImage:
            'https://app.giftango.com/GPCGraphics/Spotify_NoDenom_DIG_CR80_080618300x190_RGB.png',
          terms:
            'Terms and conditions\nBy using this card/PIN, you accept the following conditions:\n1. This PIN is redeemable for full price standalone Premium subscription months purchased directly from spotify.com only and cannot be redeemed for discounted or group subscriptions (more on eligibility at www.spotify.com/gift-card).\n2. This PIN cannot be redeemed for cash or credit and cannot be returned or resold (except where required by law).\n3. In order to redeem the PIN, you must have or register for a Spotify account and you must be 13+ and reside in the US to register.\n4. This is a single-use PIN: the full face-value for an individual account is deducted at redemption and no incremental redemption or credit is permitted.\n5. Spotify is not responsible for any loss or damage resulting from lost, stolen, or fraudulently obtained PINs or use without permission.\n6. Full Terms and Conditions governing Spotify gift PINs are found at www.spotify.com/gift-card.\n7. The Spotify Service is governed by the Spotify Terms and Conditions, which can be found at www.spotify.com/legal/end-user-agreement.\n8. This PIN is provided by Spotify USA Inc.\n9. For assistance, see support.spotify.com',
          redeemInstructions:
            'To redeem:\n1. Go to spotify.com/redeem\n2. Log in or create your Spotify account\n3. Enter the PIN',
          description:
            'With Spotify, it’s easy to find the right music for every moment – on your phone, your computer, your tablet and more.\nThere are millions of tracks on Spotify. So, whether you’re working out, partying or relaxing, the right music is always at your fingertips. Choose what you want to listen to, or let Spotify surprise you.\nYou can also browse through the music collections of friends, artists and celebrities, or create a radio station and just sit back.\n\nWhat’s on Spotify?\n\nMusic\nThere are millions of songs on Spotify. Play your favorites, discover new tracks, and build the perfect collection.\n\nPlaylists\nYou’ll find readymade playlists to match your mood, put together by music fans and experts.\n\nNew Releases\nHear this week’s latest singles and albums, and check out what’s hot in the Top 50.',
          type: 'fixed',
          amount: 10
        },
        {
          currency: 'USD',
          cardImage:
            'https://app.giftango.com/GPCGraphics/Spotify_NoDenom_DIG_CR80_080618300x190_RGB.png',
          terms:
            'Terms and conditions\nBy using this card/PIN, you accept the following conditions:\n1. This PIN is redeemable for full price standalone Premium subscription months purchased directly from spotify.com only and cannot be redeemed for discounted or group subscriptions (more on eligibility at www.spotify.com/gift-card).\n2. This PIN cannot be redeemed for cash or credit and cannot be returned or resold (except where required by law).\n3. In order to redeem the PIN, you must have or register for a Spotify account and you must be 13+ and reside in the US to register.\n4. This is a single-use PIN: the full face-value for an individual account is deducted at redemption and no incremental redemption or credit is permitted.\n5. Spotify is not responsible for any loss or damage resulting from lost, stolen, or fraudulently obtained PINs or use without permission.\n6. Full Terms and Conditions governing Spotify gift PINs are found at www.spotify.com/gift-card.\n7. The Spotify Service is governed by the Spotify Terms and Conditions, which can be found at www.spotify.com/legal/end-user-agreement.\n8. This PIN is provided by Spotify USA Inc.\n9. For assistance, see support.spotify.com',
          redeemInstructions:
            'To redeem:\n1. Go to spotify.com/redeem\n2. Log in or create your Spotify account\n3. Enter the PIN',
          description:
            'With Spotify, it’s easy to find the right music for every moment – on your phone, your computer, your tablet and more.\nThere are millions of tracks on Spotify. So, whether you’re working out, partying or relaxing, the right music is always at your fingertips. Choose what you want to listen to, or let Spotify surprise you.\nYou can also browse through the music collections of friends, artists and celebrities, or create a radio station and just sit back.\n\nWhat’s on Spotify?\n\nMusic\nThere are millions of songs on Spotify. Play your favorites, discover new tracks, and build the perfect collection.\n\nPlaylists\nYou’ll find readymade playlists to match your mood, put together by music fans and experts.\n\nNew Releases\nHear this week’s latest singles and albums, and check out what’s hot in the Top 50.',
          type: 'fixed',
          amount: 30
        },
        {
          currency: 'USD',
          cardImage:
            'https://app.giftango.com/GPCGraphics/Spotify_NoDenom_DIG_CR80_080618300x190_RGB.png',
          terms:
            'Terms and conditions\nBy using this card/PIN, you accept the following conditions:\n1. This PIN is redeemable for full price standalone Premium subscription months purchased directly from spotify.com only and cannot be redeemed for discounted or group subscriptions (more on eligibility at www.spotify.com/gift-card).\n2. This PIN cannot be redeemed for cash or credit and cannot be returned or resold (except where required by law).\n3. In order to redeem the PIN, you must have or register for a Spotify account and you must be 13+ and reside in the US to register.\n4. This is a single-use PIN: the full face-value for an individual account is deducted at redemption and no incremental redemption or credit is permitted.\n5. Spotify is not responsible for any loss or damage resulting from lost, stolen, or fraudulently obtained PINs or use without permission.\n6. Full Terms and Conditions governing Spotify gift PINs are found at www.spotify.com/gift-card.\n7. The Spotify Service is governed by the Spotify Terms and Conditions, which can be found at www.spotify.com/legal/end-user-agreement.\n8. This PIN is provided by Spotify USA Inc.\n9. For assistance, see support.spotify.com',
          redeemInstructions:
            'To redeem:\n1. Go to spotify.com/redeem\n2. Log in or create your Spotify account\n3. Enter the PIN',
          description:
            'With Spotify, it’s easy to find the right music for every moment – on your phone, your computer, your tablet and more.\nThere are millions of tracks on Spotify. So, whether you’re working out, partying or relaxing, the right music is always at your fingertips. Choose what you want to listen to, or let Spotify surprise you.\nYou can also browse through the music collections of friends, artists and celebrities, or create a radio station and just sit back.\n\nWhat’s on Spotify?\n\nMusic\nThere are millions of songs on Spotify. Play your favorites, discover new tracks, and build the perfect collection.\n\nPlaylists\nYou’ll find readymade playlists to match your mood, put together by music fans and experts.\n\nNew Releases\nHear this week’s latest singles and albums, and check out what’s hot in the Top 50.',
          type: 'fixed',
          amount: 60
        }
      ],
      Uber: [
        {
          currency: 'USD',
          cardImage: 'https://app.giftango.com/GPCGraphics/CIR_001222_00.png',
          terms:
            'Terms and Conditions\nBy using this gift card, you accept the following terms and conditions: This card is redeemable via the Uber®️ app within the U.S. in cities where Uber is available. The card is non-reloadable and, except where required by law, cannot be redeemed for cash, refunded, or returned. You may be required to add a secondary payment method to use this gift card with the Uber app. The card is not redeemable outside the U.S. Issuer is not responsible for lost or stolen cards, or unauthorized use. Depending on the state of purchase, this card is issued by Bancorp Card Services, Inc. or The Bancorp Bank. For full terms and conditions and customer service, visit uber.com/legal/gift.',
          redeemInstructions:
            'Redemption Instructions\n1. Go to the Payment section in the Uber app\n2. Tap Add Payment Method and select Gift Card\n3. Enter Gift Code',
          description:
            'Get a reliable ride in minutes with the Uber app. \n• 24/7 Safe Pickups\n• Low-cost and Premium Options\n• Ratings Ensure Premium Quality\n• Cashless Payment',
          type: 'range',
          maxAmount: 500,
          minAmount: 15
        }
      ],
      'Uber Eats': [
        {
          currency: 'USD',
          cardImage:
            'https://app.giftango.com/GPCGraphics/UberEats_NoDenom_DIG_CR80_100818_300x190_RGB.png',
          terms:
            'Terms and Conditions\nBy using this gift card, you accept the following terms and conditions: This card is redeemable via the Uber®️ or Uber Eats app within the U.S. in cities where Uber or Uber Eats is available. The card is non-reloadable and, except where required by law, cannot be redeemed for cash, refunded, or returned. You may be required to add a secondary payment method to use this gift card with the Uber or Uber Eats app. The card is not redeemable outside the U.S. Issuer is not responsible for lost or stolen cards, or unauthorized use. Depending on the state of purchase, this card is issued by Bancorp Card Services, Inc. or The Bancorp Bank. For full terms and conditions and customer service, visit uber.com/legal/gift.',
          redeemInstructions:
            'Redemption Instructions \n1.\tGo to the profile icon in your Uber Eats app\n2.\tTap Promotions\n3.\tEnter Gift Code',
          description:
            'Gift Uber Eats to the people you care about, or add value to your Uber Eats account. \n\nThe Uber Eats app is the easy and reliable way to get the food you want, delivered fast and fresh. Tap the app and pick from hundreds of full menus from local restaurants and have your order delivered to you at Uber speed. Plus, payment is automatic—no cash, no card, no hassle.',
          type: 'range',
          maxAmount: 500,
          minAmount: 15
        }
      ],
      'Mercado Livre': [
        {
          currency: 'BRL',
          maxAmount: 2000,
          minAmount: 50
        }
      ]
    };
    this.availableCardMapPromise = this.http.get(url).toPromise() as Promise<
      AvailableCardMap
    >;
    this.availableCardMapPromise = Promise.resolve(
      availableCardMapStub
    ) as Promise<AvailableCardMap>;
    const availableCardMap = await this.availableCardMapPromise;
    this.cacheApiCardConfig(availableCardMap);
    return this.availableCardMapPromise;
  }

  async cacheApiCardConfig(availableCardMap: AvailableCardMap) {
    const cardNames = Object.keys(availableCardMap);
    const previousCache = await this.persistenceProvider.getGiftCardConfigCache();
    const apiCardConfigCache = cardNames
      .filter(
        cardName =>
          availableCardMap[cardName] && availableCardMap[cardName].length
      )
      .map(cardName =>
        getCardConfigFromApiBrandConfig(availableCardMap[cardName])
      )
      .reduce((configMap, apiCardConfigMap, index) => {
        const name = cardNames[index];
        return { ...configMap, [name]: apiCardConfigMap };
      }, {});
    const newCache = {
      ...previousCache,
      ...apiCardConfigCache
    };
    if (JSON.stringify(previousCache) !== JSON.stringify(newCache)) {
      await this.persistenceProvider.setGiftCardConfigCache(newCache);
    }
  }

  async fetchCachedApiCardConfig(): Promise<AvailableCardMap> {
    this.cachedApiCardConfigPromise = this.persistenceProvider.getGiftCardConfigCache();
    return this.cachedApiCardConfigPromise;
  }

  async getCachedApiCardConfig(): Promise<AvailableCardMap> {
    const config = this.cachedApiCardConfigPromise
      ? await this.cachedApiCardConfigPromise
      : await this.fetchCachedApiCardConfig();
    return config || {};
  }

  async getAvailableCardMap() {
    return this.availableCardMapPromise
      ? this.availableCardMapPromise
      : this.fetchAvailableCardMap();
  }

  // async getAvailableCards(): Promise<CardConfig[]> {
  //   const availableCardMap = await this.getAvailableCardMap();
  //   const availableCardNames = Object.keys(availableCardMap);
  //   return this.getOfferedCards()
  //     .filter(cardConfig => availableCardNames.indexOf(cardConfig.name) > -1)
  //     .filter(
  //       cardConfig =>
  //         availableCardMap[cardConfig.name] &&
  //         availableCardMap[cardConfig.name].length
  //     )
  //     .map(cardConfig => {
  //       const apiBrandConfig = availableCardMap[cardConfig.name];
  //       const apiCardConfig = getCardConfigFromApiBrandConfig(apiBrandConfig);
  //       const fullCardConfig = {
  //         ...cardConfig,
  //         ...apiCardConfig
  //       };
  //       return fullCardConfig;
  //     });
  // }

  async getAvailableCards(): Promise<CardConfig[]> {
    const availableCardMap = await this.getAvailableCardMap();
    const availableCardNames = Object.keys(availableCardMap);
    const availableCards = this.getOfferedCards()
      .filter(cardConfig => availableCardNames.indexOf(cardConfig.name) > -1)
      .filter(
        cardConfig =>
          availableCardMap[cardConfig.name] &&
          availableCardMap[cardConfig.name].length
      )
      .map(cardConfig => {
        const apiBrandConfig = availableCardMap[cardConfig.name];
        const apiCardConfig = getCardConfigFromApiBrandConfig(apiBrandConfig);
        const fullCardConfig = {
          ...cardConfig,
          ...apiCardConfig
        };
        return fullCardConfig;
      });
    // const baseStub = {
    //   currency: 'USD',
    //   description: `Whole Foods Market is the leading organic and natural food retailer, dedicated to strict quality standards and excellent customer service. Gift Cards never expire and can buy anything at any of the 400 locations in the US and Canada.`,
    //   minAmount: 1,
    //   maxAmount: 500,
    //   terms: `You can use this card to buy our greens, but it is not redeemable for cash except as required by law. The available balance will be applied toward your purchase from soup to nuts, but may not be used to purchase other gift cards. This card will not be replaced or refunded if lost or stolen, so handle it like a carton of eggs. This card is issued by WFM Gift Card, LLC (the “Issuer”), who is the sole obligor to card owner. This card may not be resold unless approved by the Issuer. Unlike milk, this card doesn’t have an expiration date, nor does it incur any fees for any reason. Purchase, acceptance or use of this card constitutes acceptance of the complete terms and conditions, available at wholefoodsmarket.com/terms. For balance or other questions, visit wholefoodsmarket.com/giftcards or call 844-936-2273.`
    // };
    // const brandsToStub = [
    //   CardName.barnesNoble,
    //   CardName.bassProShops,
    //   CardName.burgerKing,
    //   CardName.gamestop,
    //   CardName.papaJohns,
    //   CardName.potteryBarn
    // ];
    // const stubbedCards = brandsToStub.map(b => ({
    //   ...offeredGiftCards.find(c => c.name === b),
    //   ...baseStub
    // }));
    // stubbedCards.forEach(s => availableCards.push(s));
    return availableCards.sort((a, b) => (a.name > b.name ? 1 : -1));
  }

  getOfferedCards(): BaseCardConfig[] {
    return offeredGiftCards.sort((a, b) => (a.name > b.name ? 1 : -1));
  }

  getIcon(cardName: CardName): string {
    const cardConfig = this.getOfferedCards().find(c => c.name === cardName);
    return cardConfig && cardConfig.icon;
  }

  getApiPath() {
    return `${this.credentials.BITPAY_API_URL}/gift-cards`;
  }

  public emailIsValid(email: string): boolean {
    const validEmail = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
      email
    );
    return validEmail;
  }

  public storeEmail(email: string): void {
    this.setUserInfo({ email });
  }

  public getUserEmail(): Promise<string> {
    return this.persistenceProvider
      .getGiftCardUserInfo()
      .then(data => {
        if (_.isString(data)) {
          data = JSON.parse(data);
        }
        return data && data.email
          ? data.email
          : this.emailNotificationsProvider.getEmailIfEnabled();
      })
      .catch(_ => {});
  }

  private setUserInfo(data: any): void {
    this.persistenceProvider.setGiftCardUserInfo(JSON.stringify(data));
  }

  public register() {
    this.homeIntegrationsProvider.register({
      name: 'giftcards',
      title: 'Gift Cards',
      icon: 'assets/img/gift-cards/gift-cards-icon.svg',
      show: !!this.configProvider.get().showIntegration['giftcards']
    });
  }
}

function getCardConfigFromApiBrandConfig(
  apiBrandConfig: ApiBrandConfig
): ApiCardConfig {
  const cards = apiBrandConfig;
  const [firstCard] = cards;
  // debugger;
  const { currency, description, redeemInstructions, terms } = firstCard;
  const range = cards.find(
    c => !!(c.maxAmount || c.minAmount) && c.currency === currency
  );
  const fixed = cards.filter(c => c.amount && c.currency);
  const supportedAmounts = fixed
    .reduce(
      (newSupportedAmounts, currentCard) => [
        ...newSupportedAmounts,
        currentCard.amount
      ],
      []
    )
    .sort((a, b) => a - b);

  const baseConfig = {
    currency,
    description,
    redeemInstructions,
    terms
  };

  return range
    ? {
        ...baseConfig,
        minAmount: range.minAmount < 1 ? 1 : range.minAmount,
        maxAmount: range.maxAmount
      }
    : { ...baseConfig, supportedAmounts };
}

function sortByDescendingDate(a: GiftCard, b: GiftCard) {
  return a.date < b.date ? 1 : -1;
}

function getCurrencyFromLegacySavedCard(
  cardName: CardName
): 'USD' | 'JPY' | 'BRL' {
  switch (cardName) {
    case CardName.amazon:
      return 'USD';
    case CardName.amazonJapan:
      return 'JPY';
    case CardName.mercadoLibre:
      return 'BRL';
    default:
      return 'USD';
  }
}
