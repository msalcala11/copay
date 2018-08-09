import { BuyCardPage } from './buy-card/buy-card';
import { CardDetailsPage } from './card-details/card-details';
import { CardTermsComponent } from './card-terms/card-terms';
import { ConfirmCardPurchasePage } from './confirm-card-purchase/confirm-card-purchase';
import {
  PURCHASED_CARDS_PAGE_COMPONENTS,
  PurchasedCardsPage
} from './purchased-cards/purchased-cards';

export const GIFT_CARD_PAGES = [
  BuyCardPage,
  CardDetailsPage,
  CardTermsComponent,
  ConfirmCardPurchasePage,
  PurchasedCardsPage,
  ...PURCHASED_CARDS_PAGE_COMPONENTS
];
