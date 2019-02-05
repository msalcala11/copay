export enum ClaimCodeType {
  barcode = 'barcode',
  code = 'code',
  link = 'link'
}

export interface CardConfig {
  brand?: string; // deprecated
  cardImage: string;
  currency: string;
  description?: string;
  minAmount?: number;
  maxAmount?: number;
  redeemInstructions?: string;
  supportedAmounts?: number[];
  terms: string;
  defaultClaimCodeType: ClaimCodeType;
  displayName: string;
  emailRequired: boolean;
  featured?: boolean;
  hidden?: boolean;
  icon: string;
  logo: string;
  logoBackgroundColor: string;
  name: string;
  redeemUrl?: string;
  hidePin?: boolean;
  website: string;
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
  hidden?: boolean;
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

export type ApiCardConfig = ApiCard[];

export interface AvailableCardMap {
  [cardName: string]: ApiCardConfig;
}

export interface CardConfigMap {
  [cardName: string]: CardConfig;
}
