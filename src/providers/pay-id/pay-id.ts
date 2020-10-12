import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs/observable/of';
import { catchError, timeout } from 'rxjs/operators';

export interface PayIdAddress {
  paymentNetwork: string;
  environment: string;
  addressDetailsType: string;
  addressDetails: { address: string };
}

export interface VerifiedPayIdAddressSignature {
  name: string;
  protected: string;
  signature: string;
}

export interface VerifiedPayIdAddressPayloadObject {
  payId: string;
  payIdAddress: PayIdAddress;
}

export interface VerifiedPayIdAddress {
  signatures: VerifiedPayIdAddressSignature[];
  parsedPayload: VerifiedPayIdAddressPayloadObject;
  payload: string;
}

export interface PayIdDetails {
  payId: string;
  version: string;
  addresses: PayIdAddress[];
  verifiedAddresses: VerifiedPayIdAddress[];
}

export function isPayId(value: string): boolean {
  return (
    value.includes('$') &&
    !value.startsWith('$') &&
    !value.endsWith('$') &&
    !value.endsWith('.') &&
    value.split('$')[1].includes('.') &&
    !value.includes('https://')
  );
}

export async function getPayIdUrlTemplate(
  http: HttpClient,
  payId: string
): Promise<string> {
  // const [handle, domain] = payId.split('$');
  const discoveryUrl = `https://bws.bitpay.com/bws/api/v1/service/discoverPayId/${payId}`; // `https://${domain}/.well-known/webfinger?resource=payid%3A${handle}%24${domain}`;
  const res = await (http.get(discoveryUrl).toPromise() as Promise<{
    template: string;
  }>).catch(() => undefined);
  console.log('discovery details', res);
  // res.links[0].template = `https://ematiu.sandbox.payid.org/{acctpart}`;
  return res && res.links && res.links[0] && res.links[0].template;
}

export function getPayIdUrlViaManualDiscovery(payId: string): string {
  // const parts = payId.split('$');
  return `https://bws.bitpay.com/bws/api/v1/service/payId/${payId}`; // `https://${parts[1]}/${parts[0]}`;
}

export function getAddressFromPayId(
  payIdDetails: PayIdDetails,
  params: {
    coin: string;
    network: string;
  }
): string | undefined {
  const address = payIdDetails.verifiedAddresses.find(address => {
    const paymentNetwork = address.parsedPayload.payIdAddress.paymentNetwork;
    const paymentCoin = paymentNetwork === 'XRPL' ? 'XRP' : paymentNetwork;
    return (
      paymentCoin === params.coin.toUpperCase() &&
      address.parsedPayload.payIdAddress.environment ===
        params.network.toUpperCase()
    );
  });
  return address && address.parsedPayload.payIdAddress.addressDetails.address;
}

export async function fetchPayIdDetails(
  http: HttpClient,
  payId: string
): Promise<PayIdDetails> {
  // const urlTemplate = await getPayIdUrlTemplate(http, payId);
  // const url = urlTemplate
  //   ? urlTemplate.replace('{acctpart}', payId.split('$')[0])
  //   : getPayIdUrlViaManualDiscovery(payId);
  // console.log('url', url);
  const payIdDetails = await (http
    .get(`https://bws.bitpay.com/bws/api/v1/service/payId/${payId}`)
    .pipe(
      timeout(2000),
      catchError(() => {
        // do something on a timeout
        return of(null);
      })
    )
    .toPromise() as Promise<PayIdDetails>);
  const parsedPayIdDetails = {
    ...payIdDetails,
    verifiedAddresses: payIdDetails.verifiedAddresses.map(verifiedAddress => {
      return {
        ...verifiedAddress,
        parsedPayload: JSON.parse(
          verifiedAddress.payload
        ) as VerifiedPayIdAddressPayloadObject
      };
    })
  };
  parsedPayIdDetails.verifiedAddresses[0].parsedPayload.payIdAddress.environment =
    'TESTNET';
  parsedPayIdDetails.verifiedAddresses[0].parsedPayload.payIdAddress.addressDetails.address =
    'n21ZMdccBUXnejc3Lv1XVaxtHJpASPVrNk';
  parsedPayIdDetails.verifiedAddresses[0].parsedPayload.payIdAddress.paymentNetwork =
    'BTC';
  return parsedPayIdDetails;
}
