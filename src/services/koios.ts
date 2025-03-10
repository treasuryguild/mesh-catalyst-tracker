// src/services/koios.ts
import axios from 'axios';

export interface AddressTxResponse {
  [key: string]: string | number | boolean | object | null;
}

/**
 * Fetches address transactions from Koios.
 */
export async function getAddressTxs(wallet: string): Promise<AddressTxResponse> {
  const url = "https://api.koios.rest/api/v1/address_txs";
  const data = {
    _addresses: [wallet]
  };

  const response = await axios.post(url, data, {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.KOIOS_API_KEY}`
    },
  });
  return response.data;
}

export interface AddressInfoResponse {
  [key: string]: string | number | boolean | object | null;
}

/**
 * Fetches address information (e.g. balance) from Koios.
 */
export async function getAddressInfo(wallet: string): Promise<AddressInfoResponse> {
  const url = "https://api.koios.rest/api/v1/address_info?select=balance";
  const data = {
    _addresses: [wallet],
  };

  try {
    const response = await axios.post(url, data, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.KOIOS_API_KEY}`,
      },
    });
    return response.data;
  } catch (error: unknown) {
    console.error("Error fetching address info:", error);
    if (error instanceof Error) {
      throw new Error(error.message);
    } else {
      throw new Error("Unknown error occurred");
    }
  }
}

export interface TxInfoResponse {
  [key: string]: string | number | boolean | object | null;
}

/**
 * Fetches transaction information for a given transaction ID.
 */
export async function getTxInfo(txId: string): Promise<TxInfoResponse> {
  const url = "https://api.koios.rest/api/v1/tx_info";
  const data = {
    _tx_hashes: [txId],
    _inputs: true,
    _metadata: true,
    _assets: true,
    _withdrawals: true,
    _certs: true,
    _scripts: true,
    _bytecode: true,
  };

  try {
    const response = await axios.post(url, data, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.KOIOS_API_KEY}`,
      },
    });
    return response.data;
  } catch (error: unknown) {
    console.error("Error fetching transaction info:", error);
    if (error instanceof Error) {
      throw new Error(error.message);
    } else {
      throw new Error("Unknown error occurred");
    }
  }
}

export interface AssetInfoResponse {
  [key: string]: string | number | boolean | object | null;
}

/**
 * Fetches asset information from Koios.
 */
export async function getAssetInfo(transformedArray: string[]): Promise<AssetInfoResponse> {
  const url = "https://api.koios.rest/api/v1/asset_info";
  const data = {     
    _asset_list: transformedArray,
  };

  try {
    const response = await axios.post(url, data, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.KOIOS_API_KEY}`,
      },
    });
    return response.data;
  } catch (error: unknown) {
    console.error("Error fetching asset info:", error);
    if (error instanceof Error) {
      throw new Error(error.message);
    } else {
      throw new Error("Unknown error occurred");
    }
  }
}
