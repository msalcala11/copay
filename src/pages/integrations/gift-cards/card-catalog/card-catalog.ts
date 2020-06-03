import { Component, ViewChild } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import * as _ from 'lodash';

import { BuyCardPage } from '../buy-card/buy-card';

// import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { ActionSheetProvider, PlatformProvider } from '../../../../providers';
import {
  DirectoryCategory,
  DirectoryCuration
} from '../../../../providers/directory/directory';
import {
  getDisplayNameSortValue,
  getPromo,
  GiftCardProvider,
  hasPromotion,
  hasVisibleDiscount,
  sortByDisplayName
} from '../../../../providers/gift-card/gift-card';
import { CardConfig } from '../../../../providers/gift-card/gift-card.types';
import { WideHeaderPage } from '../../../templates/wide-header-page/wide-header-page';

@Component({
  selector: 'card-catalog-page',
  templateUrl: 'card-catalog.html'
})
export class CardCatalogPage extends WideHeaderPage {
  public allCards: CardConfig[];
  public curatedCards: CardConfig[];
  public searchQuery: string = '';
  public searchQuerySubject: Subject<string> = new Subject<string>();
  public visibleCards: CardConfig[] = [];
  public cardConfigMap: { [name: string]: CardConfig };
  public curations: Array<{ displayName: string; slides: CardConfig[][] }>;
  public slides: CardConfig[][];
  public category: string;

  // public getHeaderFn = this.getHeader.bind(this);

  @ViewChild(WideHeaderPage)
  wideHeaderPage: WideHeaderPage;

  constructor(
    private actionSheetProvider: ActionSheetProvider,
    public giftCardProvider: GiftCardProvider,
    platformProvider: PlatformProvider,
    private navCtrl: NavController,
    private navParams: NavParams // private translate: TranslateService
  ) {
    super(platformProvider);
  }

  ngOnInit() {
    this.category = this.navParams.get('category');
    this.title = this.category || 'Shop';
    this.searchQuerySubject.pipe(debounceTime(300)).subscribe(query => {
      this.searchQuery = query as string;
      this.updateCardList();
    });
  }

  ionViewWillEnter() {
    this.giftCardProvider
      .getAvailableCards()
      .then(allCards => {
        console.log('allCards', allCards);
        this.cardConfigMap = allCards
          .sort(sortByDisplayName)
          .reduce(
            (map, cardConfig) => ({ ...map, [cardConfig.name]: cardConfig }),
            {}
          );
        this.allCards = allCards;
        // const uniqueCurations = _.uniqBy(
        //   this.allCards
        //     .filter(cardConfig => cardConfig.curations.length)
        //     .map(cardConfig => cardConfig.curations)
        //     .reduce((allCurations, cardConfigCurations) => [
        //       ...allCurations,
        //       ...cardConfigCurations
        //     ]),
        //   curation => curation.displayName
        // );
        const uniqueCurations = getUniqueCategoriesOrCurations(
          this.allCards,
          'curations'
        );
        const uniqueCategories = getUniqueCategoriesOrCurations(
          this.allCards,
          'categories'
        );
        this.curations = uniqueCurations.map(curation => ({
          displayName: curation.displayName,
          slides: this.allCards
            .filter(cardConfig =>
              cardConfig.curations
                .map(cardCuration => cardCuration.displayName)
                .includes(curation.displayName)
            )
            .reduce((all, one, i) => {
              const ch = Math.floor(i / 3);
              all[ch] = [].concat(all[ch] || [], one);
              return all;
            }, [])
        }));
        console.log('uniqueCurations', uniqueCurations);
        console.log('uniqueCategories', uniqueCategories);
        console.log('this.curations', this.curations);
        this.curatedCards = this.allCards
          .slice()
          .reverse()
          .slice(this.allCards.length - 6)
          .reverse();
        this.slides = this.curatedCards.reduce((all, one, i) => {
          const ch = Math.floor(i / 3);
          all[ch] = [].concat(all[ch] || [], one);
          return all;
        }, []);
        this.updateCardList();
      })
      .catch(_ => {
        this.showError();
        return [] as CardConfig[];
      });
  }

  ionViewDidEnter() {
    this.logGiftCardCatalogHomeView();
  }

  onSearch(query: string) {
    // this.searchQuery = query;
    // this.updateCardList();
    this.searchQuerySubject.next(query);
  }

  viewCategory(category: string) {
    this.navCtrl.push(CardCatalogPage, { category });
  }

  // getHeader(record, recordIndex, records) {
  //   if (record.featured && recordIndex === 0) {
  //     return this.translate.instant('Featured Brands');
  //   }
  //   const prevRecord = records[recordIndex - 1];
  //   if (
  //     (!record.featured && prevRecord && prevRecord.featured) ||
  //     (!record.featured && !prevRecord && this.searchQuery)
  //   ) {
  //     return this.translate.instant('More Brands');
  //   }
  //   return null;
  // }

  trackBy(record) {
    return record.name;
  }

  updateCardList() {
    // console.log('this.allCards', this.allCards);
    this.visibleCards = this.allCards
      .filter(c => isCardInSearchResults(c, this.searchQuery))
      .slice(0, 10);
    // console.log('this.visibleCards', this.visibleCards);
  }

  buyCard(cardConfig: CardConfig) {
    this.logGiftCardBrandView(cardConfig);

    this.navCtrl.push(BuyCardPage, { cardConfig });
    if (!!getPromo(cardConfig)) {
      this.logPromoClick(cardConfig);
    }
  }

  logGiftCardCatalogHomeView() {
    this.giftCardProvider.logEvent('giftcards_view_home', {});
  }

  logGiftCardBrandView(cardConfig: CardConfig) {
    this.giftCardProvider.logEvent('giftcards_view_brand', {
      brand: cardConfig.name
    });

    this.giftCardProvider.logEvent('view_item', {
      items: [
        {
          brand: cardConfig.name,
          category: 'giftCards'
        }
      ]
    });
  }

  logPromoClick(cardConfig: CardConfig) {
    this.giftCardProvider.logEvent(
      'clickedGiftCardPromo',
      this.giftCardProvider.getPromoEventParams(cardConfig, 'Gift Card List')
    );
  }

  hasPromotion(cardConfig: CardConfig) {
    return hasPromotion(cardConfig);
  }

  hasVisibleDiscount(cardConfig: CardConfig) {
    return hasVisibleDiscount(cardConfig);
  }

  private showError() {
    const errorInfoSheet = this.actionSheetProvider.createInfoSheet(
      'gift-cards-unavailable'
    );
    errorInfoSheet.present();
    errorInfoSheet.onDidDismiss(() => this.navCtrl.pop());
  }
}

export function isCardInSearchResults(c: CardConfig, search: string = '') {
  const cardName = (c.displayName || c.name).toLowerCase();
  const query = search.toLowerCase();
  const matchableText = [cardName, stripPunctuation(cardName)];
  return search && matchableText.some(text => text.indexOf(query) > -1);
}

export function stripPunctuation(text: string) {
  return text.replace(/[^\w\s]|_/g, '');
}

export function sortByFeaturedAndAlphabetically(a: CardConfig, b: CardConfig) {
  return getCatalogSortValue(a) > getCatalogSortValue(b) ? 1 : -1;
}

export function getCatalogSortValue(cardConfig: CardConfig) {
  return `${cardConfig.featured ? 'a' : 'b'}${getDisplayNameSortValue(
    cardConfig.displayName
  )}`;
}

function getUniqueCategoriesOrCurations<
  T extends DirectoryCategory | DirectoryCuration
>(merchants: CardConfig[], field: 'curations' | 'categories'): T[] {
  return _.uniqBy(
    merchants
      .filter(cardConfig => cardConfig[field].length)
      .map(cardConfig => cardConfig[field])
      .reduce(
        (allCurations, cardConfigCurations) => [
          ...allCurations,
          ...cardConfigCurations
        ],
        []
      ),
    categoryOrCuration => categoryOrCuration.displayName
  ) as T[];
}
