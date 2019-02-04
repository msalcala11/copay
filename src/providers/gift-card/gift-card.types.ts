export enum ClaimCodeType {
  barcode = 'barcode',
  code = 'code',
  link = 'link'
}

export interface BaseCardConfig {
  brand: string; // deprecated
  cardImage: string;
  defaultClaimCodeType: ClaimCodeType;
  displayName: string;
  emailRequired: boolean;
  featured?: boolean;
  icon: string;
  logo: string;
  logoBackgroundColor: string;
  name: string;
  redeemUrl?: string;
  hidePin?: boolean;
  website: string;
}

export interface ApiCardConfig {
  currency: string;
  description?: string;
  minAmount?: number;
  maxAmount?: number;
  redeemInstructions?: string;
  supportedAmounts?: number[];
  terms: string;
}

export interface CardConfig extends BaseCardConfig, ApiCardConfig {}

export interface GiftCard {
  accessKey: string;
  amount: number;
  archived: boolean;
  brand: string;
  claimCode: string;
  claimLink?: string;
  currency: string;
  date: number;
  invoiceId: string;
  invoiceTime?: number;
  invoiceUrl: string;
  name: string;
  pin?: string;
  status: string;
  uuid: string;
}

export type GiftCardSaveParams = Partial<{
  error: string;
  status: string;
  remove: boolean;
}>;

export interface ApiCard {
  amount?: number;
  brand?: string; // deprecated
  cardImage: string;
  currency: string;
  description: string;
  defaultClaimCodeType: ClaimCodeType;
  displayName: string;
  emailRequired: boolean;
  featured?: boolean;
  icon: string;
  logo: string;
  logoBackgroundColor: string;
  minAmount?: number;
  maxAmount?: number;
  redeemInstructions?: string;
  redeemUrl?: string;
  terms: string;
  type: 'fixed' | 'range';
  website: string;
}

export type ApiBrandConfig = ApiCard[];

export interface AvailableCardMap {
  [cardName: string]: ApiBrandConfig;
}

export interface CardConfigMap {
  [cardName: string]: CardConfig;
}
