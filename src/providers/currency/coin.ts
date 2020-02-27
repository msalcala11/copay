import { CoinsMap } from './currency';

export interface CoinOpts {
  // Bitcore-node
  name: string;
  chain: string;
  coin: string;
  unitInfo: {
    // Config/Precision
    unitName: string;
    unitToSatoshi: number;
    unitDecimals: number;
    unitCode: string;
  };
  properties: {
    // Properties
    hasMultiSig: boolean;
    hasMultiSend: boolean;
    isUtxo: boolean;
    isERCToken: boolean;
    isStableCoin: boolean;
    singleAddress: boolean;
  };
  paymentInfo: {
    paymentCode: string;
    protocolPrefix: { livenet: string; testnet: string };
    // Urls
    ratesApi: string;
    blockExplorerUrls: string;
  };
  feeInfo: {
    // Fee Units
    feeUnit: string;
    feeUnitAmount: number;
    blockTime: number;
    maxMerchantFee: string;
  };
  theme: {
    backgroundColor: string;
    gradientBackgroundColor: string;
  };
  qrColor: {
    moduleColor: string;
    positionRingColor: string;
    positionCenterColor: string;
  };
}

export const availableCoins: CoinsMap<CoinOpts> = {
  btc: {
    name: 'Bitcoin',
    chain: 'BTC',
    coin: 'btc',
    unitInfo: {
      unitName: 'BTC',
      unitToSatoshi: 100000000,
      unitDecimals: 8,
      unitCode: 'btc'
    },
    properties: {
      hasMultiSig: true,
      hasMultiSend: true,
      isUtxo: true,
      isERCToken: false,
      isStableCoin: false,
      singleAddress: false
    },
    paymentInfo: {
      paymentCode: 'BIP73',
      protocolPrefix: { livenet: 'bitcoin', testnet: 'bitcoin' },
      ratesApi: 'https://bitpay.com/api/rates',
      blockExplorerUrls: 'bitpay.com/insight/#/BTC/'
    },
    feeInfo: {
      feeUnit: 'sat/byte',
      feeUnitAmount: 1000,
      blockTime: 10,
      maxMerchantFee: 'urgent'
    },
    theme: {
      backgroundColor: 'rgba(247,146,26,1)',
      gradientBackgroundColor: 'rgba(247,146,26, 0.2)'
    },
    qrColor: {
      moduleColor: '#434D5A',
      positionRingColor: '#F7931A',
      positionCenterColor: '#434D5A'
    }
  },
  bch: {
    name: 'Bitcoin Cash',
    chain: 'BCH',
    coin: 'bch',
    unitInfo: {
      unitName: 'BCH',
      unitToSatoshi: 100000000,
      unitDecimals: 8,
      unitCode: 'bch'
    },
    properties: {
      hasMultiSig: true,
      hasMultiSend: true,
      isUtxo: true,
      isERCToken: false,
      isStableCoin: false,
      singleAddress: false
    },
    paymentInfo: {
      paymentCode: 'BIP73',
      protocolPrefix: { livenet: 'bitcoincash', testnet: 'bchtest' },
      ratesApi: 'https://bitpay.com/api/rates/bch',
      blockExplorerUrls: 'bitpay.com/insight/#/BCH/'
    },
    feeInfo: {
      feeUnit: 'sat/byte',
      feeUnitAmount: 1000,
      blockTime: 10,
      maxMerchantFee: 'normal'
    },
    theme: {
      backgroundColor: 'rgba(47,207,110,1)',
      gradientBackgroundColor: 'rgba(47,207,110, 0.2)'
    },
    qrColor: {
      moduleColor: '#434D5A',
      positionRingColor: '#434D5A',
      positionCenterColor: '#2FCF6E'
    }
  },
  eth: {
    name: 'Ethereum',
    chain: 'ETH',
    coin: 'eth',
    unitInfo: {
      unitName: 'ETH',
      unitToSatoshi: 1e18,
      unitDecimals: 18,
      unitCode: 'eth'
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: false,
      isStableCoin: false,
      singleAddress: true
    },
    paymentInfo: {
      paymentCode: 'EIP681',
      protocolPrefix: { livenet: 'ethereum', testnet: 'ethereum' },
      ratesApi: 'https://bitpay.com/api/rates/eth',
      blockExplorerUrls: 'bitpay.com/insight/#/ETH/'
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent'
    },
    theme: {
      backgroundColor: 'rgba(135,206,250,1)',
      gradientBackgroundColor: 'rgba(30,144,255, 0.2)'
    },
    qrColor: {
      moduleColor: '#434D5A',
      positionRingColor: '#434D5A',
      positionCenterColor: '#6B71D6'
    }
  },
  xrp: {
    name: 'XRP',
    chain: 'XRP',
    coin: 'xrp',
    unitInfo: {
      unitName: 'XRP',
      unitToSatoshi: 1e6,
      unitDecimals: 6,
      unitCode: 'xrp'
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: false,
      isStableCoin: false,
      singleAddress: true
    },
    paymentInfo: {
      paymentCode: 'BIP73',
      protocolPrefix: { livenet: 'ripple', testnet: 'ripple' },
      ratesApi: 'https://bitpay.com/api/rates/xrp',
      blockExplorerUrls: 'xrpscan.com/'
    },
    feeInfo: {
      feeUnit: 'drops',
      feeUnitAmount: 1e6,
      blockTime: 0.05,
      maxMerchantFee: 'normal'
    },
    theme: {
      backgroundColor: 'rgba(35,41,47,1)',
      gradientBackgroundColor: 'rgba(68,79,91, 0.2)'
    },
    qrColor: {
      moduleColor: '#4E4E50',
      positionRingColor: '#333333',
      positionCenterColor: '#9E9E9E'
    }
  },
  pax: {
    name: 'Paxos Standard',
    chain: 'ETH',
    coin: 'pax',
    unitInfo: {
      unitName: 'PAX',
      unitToSatoshi: 1e18,
      unitDecimals: 18,
      unitCode: 'pax'
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: true,
      isStableCoin: true,
      singleAddress: true
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: { livenet: 'ethereum', testnet: 'ethereum' },
      ratesApi: 'https://bitpay.com/api/rates/pax',
      blockExplorerUrls: 'bitpay.com/insight/#/ETH/'
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent'
    },
    theme: {
      backgroundColor: 'rgba(0,132,93,1)',
      gradientBackgroundColor: 'rgba(0,209,147, 0.2)'
    },
    qrColor: {
      moduleColor: '#434D5A',
      positionRingColor: '#51B849',
      positionCenterColor: '#434D5A'
    }
  },
  usdc: {
    name: 'USD Coin',
    chain: 'ETH',
    coin: 'usdc',
    unitInfo: {
      unitName: 'USDC',
      unitToSatoshi: 1e6,
      unitDecimals: 6,
      unitCode: 'usdc'
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: true,
      isStableCoin: true,
      singleAddress: true
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: { livenet: 'ethereum', testnet: 'ethereum' },
      ratesApi: 'https://bitpay.com/api/rates/usdc',
      blockExplorerUrls: 'bitpay.com/insight/#/ETH/'
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent'
    },
    theme: {
      backgroundColor: 'rgba(39,117,201,1)',
      gradientBackgroundColor: 'rgba(93,156,224, 0.2)'
    },
    qrColor: {
      moduleColor: '#434D5A',
      positionRingColor: '#2775CA',
      positionCenterColor: '#434D5A'
    }
  },
  gusd: {
    name: 'Gemini Dollar',
    chain: 'ETH',
    coin: 'gusd',
    unitInfo: {
      unitName: 'GUSD',
      unitToSatoshi: 1e2,
      unitDecimals: 2,
      unitCode: 'gusd'
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: true,
      isStableCoin: true,
      singleAddress: true
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: { livenet: 'ethereum', testnet: 'ethereum' },
      ratesApi: 'https://bitpay.com/api/rates/gusd',
      blockExplorerUrls: 'bitpay.com/insight/#/ETH/'
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent'
    },
    theme: {
      backgroundColor: 'rgba(0,220,250,1)',
      gradientBackgroundColor: 'rgba(72,233,255, 0.2)'
    },
    qrColor: {
      moduleColor: '#434D5A',
      positionRingColor: '#00DCFA',
      positionCenterColor: '#434D5A'
    }
  }
};
