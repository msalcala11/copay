export enum ClaimCodeType {
  barcode = 'barcode',
  code = 'code',
  link = 'link'
}

export interface CommonCardConfig {
  brand?: string; // deprecated
  cardImage: string;
  currency: string;
  defaultClaimCodeType: ClaimCodeType;
  description?: string;
  displayName: string;
  emailRequired: boolean;
  featured?: boolean;
  hidden?: boolean;
  hidePin?: boolean;
  icon: string;
  logo: string;
  logoBackgroundColor: string;
  minAmount?: number;
  maxAmount?: number;
  redeemInstructions?: string;
  redeemUrl?: string;
  terms: string;
  website: string;
}

export interface CardConfig extends CommonCardConfig {
  name: string;
  supportedAmounts?: number[];
}

export interface GiftCard {
  accessKey: string;
  amount: number;
  archived: boolean;
  brand?: string; // deprecated
  claimCode: string;
  claimLink?: string;
  currency: string;
  date: number;
  displayName: string;
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

export interface ApiCard extends CommonCardConfig {
  amount?: number;
  type: 'fixed' | 'range';
}

export type ApiCardConfig = ApiCard[];

export interface AvailableCardMap {
  [cardName: string]: ApiCardConfig;
}

export interface CardConfigMap {
  [cardName: string]: CardConfig;
}
