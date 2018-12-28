import { BaseCardConfig, CardBrand, CardName } from './gift-card.types';

export const offeredGiftCards: BaseCardConfig[] = [
  {
    brand: CardBrand.venue, // For Testnet
    cardImage: 'https://app.giftango.com/GPCGraphics/CIR_000717_00.png',
    defaultClaimCodeType: 'code',
    emailRequired: false,
    icon: 'https://app.giftango.com/GPCGraphics/CIR_000717_00.png',
    logo: 'https://app.giftango.com/GPCGraphics/CIR_000717_00.png',
    logoBackgroundColor: '#913318',
    name: CardName.venue,
    website: 'venue.com'
  },
  {
    brand: CardBrand.amazon,
    cardImage: 'assets/img/gift-cards/amazon/amazon-gift-card.png',
    defaultClaimCodeType: 'code',
    emailRequired: true,
    icon: 'assets/img/gift-cards/amazon/amazon-icon.svg',
    logo: 'assets/img/gift-cards/amazon/amazon-logo.svg',
    logoBackgroundColor: '#363636',
    name: CardName.amazon,
    redeemUrl: 'https://www.amazon.com/gc/redeem?claimCode=',
    website: 'amazon.com'
  },
  {
    brand: CardBrand.amazon,
    cardImage: 'assets/img/gift-cards/amazon/amazon-japan-gift-card.png',
    defaultClaimCodeType: 'code',
    emailRequired: true,
    icon: 'assets/img/gift-cards/amazon/amazon-icon.svg',
    logo: 'assets/img/gift-cards/amazon/amazon-logo.png',
    logoBackgroundColor: '#363636',
    name: CardName.amazonJapan,
    redeemUrl: 'https://www.amazon.co.jp/gc/redeem?claimCode=',
    website: 'amazon.co.jp'
  },
  {
    brand: CardBrand.barnesNoble,
    cardImage:
      'assets/img/gift-cards/barnes-and-noble/barnes-and-noble-gift-card.png',
    defaultClaimCodeType: 'barcode',
    emailRequired: false,
    icon: 'assets/img/gift-cards/barnes-and-noble/barnes-and-noble-icon.svg',
    logo: 'assets/img/gift-cards/barnes-and-noble/barnes-and-noble-logo.svg',
    logoBackgroundColor: '#356251',
    name: CardName.barnesNoble,
    website: 'barnesandnoble.com'
  },
  {
    brand: CardBrand.carnivalCruiseLine,
    cardImage:
      'assets/img/gift-cards/carnival-cruise-line/carnival-cruise-line-card.png',
    defaultClaimCodeType: 'code',
    emailRequired: false,
    icon:
      'assets/img/gift-cards/carnival-cruise-line/carnival-cruise-line-icon.png',
    logo:
      'assets/img/gift-cards/carnival-cruise-line/carnival-cruise-line-logo.svg',
    logoBackgroundColor: '#ffffff',
    name: CardName.carnivalCruiseLine,
    website: 'carnival.com'
  },
  {
    brand: CardBrand.delta,
    cardImage: 'assets/img/gift-cards/delta/delta-gift-card.png',
    defaultClaimCodeType: 'link',
    emailRequired: false,
    icon: 'assets/img/gift-cards/delta/delta-icon.svg',
    logo: 'assets/img/gift-cards/delta/delta-logo.svg',
    logoBackgroundColor: '#ffffff',
    name: CardName.delta,
    website: 'delta.com'
  },
  {
    brand: CardBrand.dsw,
    cardImage: 'assets/img/gift-cards/dsw/dsw-gift-card.png',
    defaultClaimCodeType: 'barcode',
    emailRequired: false,
    icon: 'assets/img/gift-cards/dsw/dsw-icon.svg',
    logo: 'assets/img/gift-cards/dsw/dsw-logo.svg',
    logoBackgroundColor: '#000000',
    name: CardName.dsw,
    website: 'dsw.com'
  },
  {
    brand: CardBrand.gamestop,
    cardImage: 'assets/img/gift-cards/gamestop/gamestop-gift-card.png',
    defaultClaimCodeType: 'barcode',
    emailRequired: false,
    icon: 'assets/img/gift-cards/gamestop/gamestop-icon.svg',
    logo: 'assets/img/gift-cards/gamestop/gamestop-logo.svg',
    logoBackgroundColor: '#000000',
    name: CardName.gamestop,
    website: 'gamestop.com'
  },
  {
    brand: CardBrand.googlePlay,
    cardImage: 'assets/img/gift-cards/google-play/google-play-gift-card.png',
    defaultClaimCodeType: 'code',
    emailRequired: false,
    hidePin: true,
    icon: 'assets/img/gift-cards/google-play/google-play-icon.png',
    logo: 'assets/img/gift-cards/google-play/google-play-logo.svg',
    logoBackgroundColor: '#ffffff',
    name: CardName.googlePlay,
    redeemUrl: 'https://play.google.com/redeem?code=',
    website: 'play.google.com'
  },
  {
    brand: CardBrand.homeDepot,
    cardImage: 'assets/img/gift-cards/home-depot/home-depot-card.png',
    defaultClaimCodeType: 'barcode',
    emailRequired: false,
    icon: 'assets/img/gift-cards/home-depot/home-depot-icon.svg',
    logo: 'assets/img/gift-cards/home-depot/home-depot-logo.svg',
    logoBackgroundColor: '#E17232',
    name: CardName.homeDepot,
    website: 'homedepot.com'
  },
  {
    brand: CardBrand.hotelsCom,
    cardImage: 'assets/img/gift-cards/hotels.com/hotels.com-card.png',
    defaultClaimCodeType: 'code',
    emailRequired: false,
    icon: 'assets/img/gift-cards/hotels.com/hotels.com-icon.svg',
    logo: 'assets/img/gift-cards/hotels.com/hotels.com-logo.svg',
    logoBackgroundColor: '#DB4545',
    name: CardName.hotelsCom,
    website: 'hotels.com'
  },
  {
    brand: CardBrand.mercadoLibre,
    cardImage: 'assets/img/gift-cards/mercado-libre/mercado-livre-card.png',
    defaultClaimCodeType: 'code',
    emailRequired: false,
    icon: 'assets/img/gift-cards/mercado-libre/mercado-livre-icon.svg',
    logo: 'assets/img/gift-cards/mercado-libre/mercado-livre-logo.svg',
    logoBackgroundColor: '#ffffff',
    name: CardName.mercadoLibre,
    website: 'mercadolivre.com.br'
  },
  {
    brand: CardBrand.royalCaribbean,
    cardImage: 'assets/img/gift-cards/royal-caribbean/royal-caribbean-card.png',
    defaultClaimCodeType: 'link',
    emailRequired: false,
    icon: 'assets/img/gift-cards/royal-caribbean/royal-caribbean-icon.svg',
    logo: 'assets/img/gift-cards/royal-caribbean/royal-caribbean-logo.svg',
    logoBackgroundColor: '#0668A4',
    name: CardName.royalCaribbean,
    website: 'royalcaribbean.com'
  },
  {
    brand: CardBrand.uber,
    cardImage: 'assets/img/gift-cards/uber/uber-gift-card.png',
    defaultClaimCodeType: 'code',
    emailRequired: false,
    icon: 'assets/img/gift-cards/uber/uber-icon.svg',
    logo: 'assets/img/gift-cards/uber/uber-logo.svg',
    logoBackgroundColor: '#000000',
    name: CardName.uber,
    website: 'uber.com'
  },
  {
    brand: CardBrand.uberEats,
    cardImage: 'assets/img/gift-cards/uber-eats/uber-eats-card.png',
    defaultClaimCodeType: 'code',
    emailRequired: false,
    icon: 'assets/img/gift-cards/uber-eats/uber-eats-icon.svg',
    logo: 'assets/img/gift-cards/uber-eats/uber-eats-logo.svg',
    logoBackgroundColor: '#000000',
    name: CardName.uberEats,
    website: 'uber.com'
  }
];
