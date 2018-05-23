import {
  CustomModalButtonCancel,
  CustomModalButtonConfirm,
  CustomModalComponent,
  CustomModalContent,
  CustomModalHeading,
  CustomModalIcon,
  CustomModalMessage
} from './custom-modal/custom-modal';
import {
  ExpandableHeaderComponent,
  ExpandableHeaderFooterComponent,
  ExpandableHeaderPrimaryComponent
} from './expandable-header/expandable-header';

const EXPANDABLE_HEADER_COMPONENTS = [
  ExpandableHeaderComponent,
  ExpandableHeaderFooterComponent,
  ExpandableHeaderPrimaryComponent
];

export const COMPONENTS = [
  CustomModalButtonCancel,
  CustomModalButtonConfirm,
  CustomModalComponent,
  CustomModalContent,
  CustomModalHeading,
  CustomModalIcon,
  CustomModalMessage,
  EXPANDABLE_HEADER_COMPONENTS
];

console.log('COMPONENTS', COMPONENTS);
