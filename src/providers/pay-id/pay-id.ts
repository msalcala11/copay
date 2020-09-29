import { HttpClient } from '@angular/common/http';

export interface PayIdAddress {
  paymentNetwork: string;
  environment: string;
  addressDetailsType: string;
  addressDetails: { address: string };
}

export interface PayIdDetails {
  payId: string;
  version: string;
  addresses: PayIdAddress[];
}

export function isPayId(value: string): boolean {
  return (
    value.includes('$') &&
    !value.startsWith('$') &&
    !value.includes('https://') &&
    value.endsWith('ematiu.sandbox.payid.org')
  );
}

export function getPayIdUrl(payId: string): string {
  const parts = payId.split('$');
  return `https://${parts[1]}/${parts[0]}`;
}

export function getAddressFromPayId(
  payIdDetails: PayIdDetails,
  params: {
    coin: string;
    network: string;
  }
): string | undefined {
  const address = payIdDetails.addresses.find(
    address =>
      address.paymentNetwork === params.coin.toUpperCase() &&
      address.environment === params.network.toUpperCase()
  );
  return address && address.addressDetails.address;
}

export async function fetchPayIdDetails(
  http: HttpClient,
  payId: string
): Promise<PayIdDetails> {
  const url = getPayIdUrl(payId);
  return http
    .get(url, {
      headers: {
        'PayID-Version': '1.0',
        Accept: 'application/payid+json'
      }
    })
    .toPromise() as Promise<PayIdDetails>;
}
