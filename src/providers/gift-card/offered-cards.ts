import {
  BaseCardConfig,
  CardBrand,
  CardName,
  ClaimCodeType
} from './gift-card.types';

const GIFT_CARD_IMAGE_PATH = 'assets/img/gift-cards/';

export const offeredGiftCards: BaseCardConfig[] = [
  {
    brand: CardBrand.venue, // For Testnet
    defaultClaimCodeType: ClaimCodeType.code,
    emailRequired: false,
    logoBackgroundColor: '#913318',
    name: CardName.venue,
    website: 'venue.com'
  },
  {
    brand: CardBrand.amazon,
    defaultClaimCodeType: ClaimCodeType.code,
    emailRequired: true,
    logoBackgroundColor: '#363636',
    name: CardName.amazon,
    redeemUrl: 'https://www.amazon.com/gc/redeem?claimCode=',
    website: 'amazon.com'
  },
  {
    brand: CardBrand.amazon,
    defaultClaimCodeType: ClaimCodeType.code,
    emailRequired: true,
    logoBackgroundColor: '#363636',
    name: CardName.amazonJapan,
    redeemUrl: 'https://www.amazon.co.jp/gc/redeem?claimCode=',
    website: 'amazon.co.jp'
  },
  {
    brand: CardBrand.barnesNoble,
    defaultClaimCodeType: ClaimCodeType.barcode,
    emailRequired: false,
    logoBackgroundColor: '#356251',
    name: CardName.barnesNoble,
    website: 'barnesandnoble.com'
  },
  {
    brand: CardBrand.carnivalCruiseLine,
    defaultClaimCodeType: ClaimCodeType.code,
    emailRequired: false,
    icon: `${GIFT_CARD_IMAGE_PATH}${CardName.carnivalCruiseLine}/icon.png`,
    logoBackgroundColor: '#ffffff',
    name: CardName.carnivalCruiseLine,
    website: 'carnival.com'
  },
  {
    brand: CardBrand.delta,
    defaultClaimCodeType: ClaimCodeType.link,
    emailRequired: false,
    logoBackgroundColor: '#ffffff',
    name: CardName.delta,
    website: 'delta.com'
  },
  {
    brand: CardBrand.dsw,
    defaultClaimCodeType: ClaimCodeType.barcode,
    emailRequired: false,
    logoBackgroundColor: '#000000',
    name: CardName.dsw,
    website: 'dsw.com'
  },
  {
    brand: CardBrand.gamestop,
    defaultClaimCodeType: ClaimCodeType.barcode,
    emailRequired: false,
    logoBackgroundColor: '#000000',
    name: CardName.gamestop,
    website: 'gamestop.com'
  },
  {
    brand: CardBrand.googlePlay,
    defaultClaimCodeType: ClaimCodeType.code,
    emailRequired: false,
    hidePin: true,
    logoBackgroundColor: '#ffffff',
    name: CardName.googlePlay,
    redeemUrl: 'https://play.google.com/redeem?code=',
    website: 'play.google.com'
  },
  {
    brand: CardBrand.homeDepot,
    defaultClaimCodeType: ClaimCodeType.barcode,
    emailRequired: false,
    logoBackgroundColor: '#E17232',
    name: CardName.homeDepot,
    website: 'homedepot.com'
  },
  {
    brand: CardBrand.hotelsCom,
    defaultClaimCodeType: ClaimCodeType.code,
    emailRequired: false,
    logoBackgroundColor: '#DB4545',
    name: CardName.hotelsCom,
    website: 'hotels.com'
  },
  {
    brand: CardBrand.mercadoLibre,
    defaultClaimCodeType: ClaimCodeType.code,
    emailRequired: false,
    logoBackgroundColor: '#ffffff',
    name: CardName.mercadoLibre,
    website: 'mercadolivre.com.br'
  },
  {
    brand: CardBrand.royalCaribbean,
    defaultClaimCodeType: ClaimCodeType.link,
    emailRequired: false,
    logoBackgroundColor: '#0668A4',
    name: CardName.royalCaribbean,
    website: 'royalcaribbean.com'
  },
  {
    brand: CardBrand.uber,
    defaultClaimCodeType: ClaimCodeType.code,
    emailRequired: false,
    logoBackgroundColor: '#000000',
    name: CardName.uber,
    website: 'uber.com'
  },
  {
    brand: CardBrand.uberEats,
    defaultClaimCodeType: ClaimCodeType.code,
    emailRequired: false,
    logoBackgroundColor: '#000000',
    name: CardName.uberEats,
    website: 'uber.com'
  }
]
  .map(c => ({
    ...c,
    cardImage: `${GIFT_CARD_IMAGE_PATH}${c.name}/card.png`,
    icon: `${GIFT_CARD_IMAGE_PATH}${c.name}/icon.svg`,
    logo: `${GIFT_CARD_IMAGE_PATH}${c.name}/logo.svg`
  }))
  .map(c => ({
    ...c,
    icon:
      c.name === CardName.carnivalCruiseLine || c.name === CardName.googlePlay
        ? `${GIFT_CARD_IMAGE_PATH}${c.name}/icon.png`
        : c.icon
  }));
