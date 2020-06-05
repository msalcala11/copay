import { Injectable } from '@angular/core';
import {
  DirectIntegration,
  Directory,
  DirectoryCategory,
  DirectoryCuration,
  fetchDirectIntegrations,
  fetchDirectory
} from '../directory/directory';
import { GiftCardProvider, sortByDisplayName } from '../gift-card/gift-card';
import { CardConfig } from '../gift-card/gift-card.types';

export interface Merchant extends DirectIntegration {
  categories: DirectoryCategory[];
  curations: DirectoryCuration[];
  name: string;
  featured?: boolean;
  hasDirectIntegration: boolean;
  giftCards: CardConfig[];
}

@Injectable()
export class MerchantProvider {
  merchantPromise: Promise<Merchant[]>;
  constructor(private giftCardProvider: GiftCardProvider) {}
  fetchMerchants() {
    this.merchantPromise = Promise.all([
      fetchDirectIntegrations(),
      this.giftCardProvider.getAvailableCards(),
      fetchDirectory()
    ]).then(([directIntegrations, availableGiftCardBrands, directory]) =>
      buildMerchants(directIntegrations, availableGiftCardBrands, directory)
    );
    return this.merchantPromise;
  }
  getMerchants() {
    return this.merchantPromise ? this.merchantPromise : this.fetchMerchants();
  }
}

export function buildMerchants(
  directIntegrations: DirectIntegration[] = [],
  availableGiftCardBrands: CardConfig[] = [],
  directory: Directory
): Merchant[] {
  const directIntegrationMerchants = directIntegrations.map(integration => ({
    ...integration,
    hasDirectIntegration: true,
    giftCards: []
  }));
  const giftCardMerchants = availableGiftCardBrands.map(cardConfig => ({
    hasDirectIntegration: false,
    name: cardConfig.name,
    displayName: cardConfig.displayName,
    caption: cardConfig.description,
    featured: cardConfig.featured,
    icon: cardConfig.icon,
    link: cardConfig.website,
    displayLink: cardConfig.website,
    tags: cardConfig.tags || [],
    domains: [cardConfig.website].concat(cardConfig.supportedUrls || []),
    theme: cardConfig.brandColor || cardConfig.logoBackgroundColor,
    instructions: cardConfig.description,
    giftCards: [cardConfig]
  }));
  return ([...directIntegrationMerchants, ...giftCardMerchants] as Merchant[])
    .map(merchant => appendCategories(merchant, directory))
    .sort(sortByDisplayName);
}

export function appendCategories(
  merchant: Merchant,
  directory: Directory
): Merchant {
  return {
    ...merchant,
    categories: directory.categories
      .map((category, index) => ({ ...category, index }))
      .filter(category =>
        category.tags.some(tag => merchant.tags.includes(tag))
      ),
    curations: directory.curated
      .map((curation, index) => ({
        ...curation,
        index,
        merchantIndex: curation.merchants.indexOf(merchant.displayName)
      }))
      .filter(curation => curation.merchants.includes(merchant.displayName))
  };
}
