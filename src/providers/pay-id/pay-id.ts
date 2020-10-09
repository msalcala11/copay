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

export async function getPayIdUrlTemplate(
  http: HttpClient,
  payId: string
): Promise<string> {
  const [handle, domain] = payId.split('$');
  const discoveryUrl = `https://${domain}/.well-known/webfinger?resource=payid%3A${handle}%24${domain}`;
  const res = await (http
    .get(discoveryUrl, {
      headers: {
        'PayID-Version': '1.0',
        Accept: 'application/payid+json'
      }
    })
    .toPromise() as Promise<{ template: string }>).catch(() => undefined);
  // res.links[0].template = `https://ematiu.sandbox.payid.org/{acctpart}`;
  return res && res.links && res.links[0] && res.links[0].template;
}

export function getPayIdUrlViaManualDiscovery(payId: string): string {
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
  const urlTemplate = await getPayIdUrlTemplate(http, payId);
  const url = urlTemplate
    ? urlTemplate.replace('{acctpart}', payId.split('$')[0])
    : getPayIdUrlViaManualDiscovery(payId);
  const payIdDetails = await (http
    .get(url, {
      headers: {
        'PayID-Version': '1.0',
        Accept: 'application/payid+json'
      }
    })
    .toPromise() as Promise<PayIdDetails>);
  payIdDetails.addresses[0].environment = 'TESTNET';
  payIdDetails.addresses[0].addressDetails.address =
    'n21ZMdccBUXnejc3Lv1XVaxtHJpASPVrNk';
  return payIdDetails;
}
