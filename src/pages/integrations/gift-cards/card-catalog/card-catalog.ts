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
import {
  Merchant,
  MerchantProvider
} from '../../../../providers/merchant/merchant';
import { WideHeaderPage } from '../../../templates/wide-header-page/wide-header-page';

@Component({
  selector: 'card-catalog-page',
  templateUrl: 'card-catalog.html'
})
export class CardCatalogPage extends WideHeaderPage {
  public allMerchants: Merchant[];
  public allCards: CardConfig[];
  public searchQuery: string = '';
  public searchQuerySubject: Subject<string> = new Subject<string>();
  public visibleCards: CardConfig[] = [];
  public visibleMerchants: Merchant[] = [];
  public cardConfigMap: { [name: string]: CardConfig };
  public categories: DirectoryCategory[];
  public curations: Array<{ displayName: string; slides: CardConfig[][] }>;
  public category: string;

  // public getHeaderFn = this.getHeader.bind(this);

  @ViewChild(WideHeaderPage)
  wideHeaderPage: WideHeaderPage;

  constructor(
    private actionSheetProvider: ActionSheetProvider,
    public giftCardProvider: GiftCardProvider,
    private merchantProvider: MerchantProvider,
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

    this.merchantProvider
      .getMerchants()
      .then(async merchants => {
        console.log('merchants', merchants);
        this.cardConfigMap = merchants
          .sort(sortByDisplayName)
          .reduce(
            (map, cardConfig) => ({ ...map, [cardConfig.name]: cardConfig }),
            {}
          );
        this.allMerchants = merchants;
        const uniqueCurations = getUniqueCategoriesOrCurations<
          DirectoryCuration
        >(this.allMerchants, 'curations');
        this.categories = getUniqueCategoriesOrCurations<DirectoryCategory>(
          this.allMerchants,
          'categories'
        );
        console.log('categories', this.categories);
        this.curations = uniqueCurations.map(curation => ({
          displayName: curation.displayName,
          slides: this.allMerchants
            .filter(merchant =>
              merchant.curations
                .map(merchantCuration => merchantCuration.displayName)
                .includes(curation.displayName)
            )
            .reduce((all, one, i) => {
              const ch = Math.floor(i / 3);
              all[ch] = [].concat(all[ch] || [], one);
              return all;
            }, [])
        }));
        console.log('curations', this.curations);
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
    this.visibleMerchants = this.allMerchants
      .filter(merchant => isMerchantInSearchResults(merchant, this.searchQuery))
      .filter(
        c =>
          !this.category ||
          this.category === 'All' ||
          c.categories
            .map(category => category.displayName)
            .includes(this.category)
      );
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

export function isMerchantInSearchResults(m: Merchant, search: string = '') {
  const merchantName = (m.displayName || m.name).toLowerCase();
  const query = search.toLowerCase();
  const matchableText = [merchantName, stripPunctuation(merchantName)];
  return !search || matchableText.some(text => text.indexOf(query) > -1);
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
>(merchants: Merchant[], field: 'curations' | 'categories'): T[] {
  return (_.uniqBy(
    merchants
      .filter(merchant => merchant[field].length)
      .map(merchant => merchant[field])
      .reduce(
        (allCurations, merchantCurations) => [
          ...allCurations,
          ...merchantCurations
        ],
        []
      ),
    categoryOrCuration => categoryOrCuration.displayName
  ) as T[]).sort((a, b) => a.index - b.index);
}
