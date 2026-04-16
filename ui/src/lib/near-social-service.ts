import * as NearSocialJS from "near-social-js";
import type { Network } from "near-kit";
import type { PostContent } from "@crosspost/plugin/types";
import { getErrorMessage, isPlatformError } from "@crosspost/sdk";
import { NETWORK_ID } from "@/config";
import { getWalletInstance } from "@/lib/near";

export const SOCIAL_CONTRACT = {
  mainnet: "social.near",
  testnet: "v1.social08.testnet",
};

export const GAS_FEE_IN_ATOMIC_UNITS = "30000000000000";
export const MINIMUM_STORAGE_IN_BYTES = "2000";
export const ONE_YOCTO = "1";
export const STORAGE_COST_PER_BYTES_IN_ATOMIC_UNITS = "10000000000000000000";
export const EXTRA_STORAGE_BALANCE = "500";
export const ESTIMATED_KEY_VALUE_SIZE = 140; // 40 * 3 + 8 + 12
export const ESTIMATED_NODE_SIZE = 98; // 40 * 2 + 8 + 10

import BigNumber from "bignumber.js";

interface StorageBalanceResult {
  available: string;
  total: string;
}

interface IOptions {
  data: Record<string, Record<string, unknown>>;
  storageBalance: StorageBalanceResult | null;
}

/**
 * Convenience function that checks if a value is an object.
 * @param {unknown} value - the value to check.
 * @returns {boolean} true, if the value is considered an object, false otherwise.
 */
export function isObject(value: unknown): boolean {
  return value === Object(value) && !Array.isArray(value) && typeof value !== "function";
}

/**
 * Calculates the size of some data.
 * @param {Record<string, unknown> | string} data - the data.
 * @returns {BigNumber} the size of the data.
 * @see {@link https://github.com/NearSocial/VM/blob/6047c6a9b96f3de14e600c1d2b96c432bbb76dd4/src/lib/data/utils.js#L193}
 */
export function calculateSizeOfData(data: Record<string, unknown> | string): bigint {
  const calculate = (_data: unknown, previousData?: Record<string, unknown> | string): bigint => {
    if (isObject(_data)) {
      return Object.entries(_data as Record<string, unknown>).reduce<bigint>(
        (acc, [key, value]) => {
          if (previousData && isObject(previousData)) {
            return (
              acc +
              calculate({
                data: value,
                previousData: (previousData as Record<string, unknown>)[key],
              })
            );
          }

          return acc + BigInt(key.length * 2) + calculate(value) + BigInt(ESTIMATED_KEY_VALUE_SIZE);
        },
        BigInt(isObject(previousData) ? 0 : ESTIMATED_NODE_SIZE),
      );
    }

    return BigInt(
      (typeof _data === "string" ? _data.length : 8) -
        (previousData && typeof previousData === "string" ? previousData.length : 0),
    );
  };

  return calculate(data);
}

// utils
/**
 * Calculates the deposit required for storage. If the storage balance is not available, a minimum storage cost is
 * required. However, if the cost of the data exceeds the minimum storage cost, the cost of the data is used. In the
 * instances that there is storage balance available, the deposit is determined based on the difference between the
 * available and the required amount.
 * @param {IOptions} options - the data to be stored and the storage balance.
 * @returns {BigNumber} the required deposit.
 */
export function calculateRequiredDeposit({ data, storageBalance }: IOptions): BigNumber {
  const minimumStorageCost: BigNumber = new BigNumber(MINIMUM_STORAGE_IN_BYTES).multipliedBy(
    new BigNumber(STORAGE_COST_PER_BYTES_IN_ATOMIC_UNITS),
  );
  const storageCostOfData: BigNumber = new BigNumber(String(calculateSizeOfData(data)))
    .plus(EXTRA_STORAGE_BALANCE) // https://github.com/NearSocial/VM/blob/6047c6a9b96f3de14e600c1d2b96c432bbb76dd4/src/lib/data/commitData.js#L62
    .multipliedBy(STORAGE_COST_PER_BYTES_IN_ATOMIC_UNITS);
  let storageDepositAvailable: BigNumber;

  // if there is no balance, use the minimum storage cost, or the storage cost of the data
  if (!storageBalance) {
    return storageCostOfData.lt(minimumStorageCost) ? minimumStorageCost : storageCostOfData;
  }

  storageDepositAvailable = new BigNumber(storageBalance.available.toString());

  // if the storage deposit available is less than the cost of storage, use the difference as the required deposit
  return storageDepositAvailable.lt(storageCostOfData)
    ? storageCostOfData.minus(storageDepositAvailable)
    : new BigNumber("0");
}

type TValue = bigint | number | string | Record<string, unknown>;

/**
 * Recursively transverses an object and returns the nested objects as "/" separated keys.
 * @param {Record<string, unknown>} data - the object to parse.
 * @returns {string[]} the nested objects as a set of keys.
 * @example
 *
 * input: {
 *   ['odin.test.near']: {
 *     profile: {
 *       name: 'Odin',
 *     },
 *     type: 'aesir',
 *   },
 * }
 * output: ['odin.test.near/profile/name', 'odin.test.near/type']
 */
export function parseKeyFromData(data: Record<string, unknown>): string[] {
  const parse = (keys: string[], value: TValue): string | string[] => {
    // if the value is not a nested object, we can stop recursing
    if (typeof value !== "object") {
      return keys.join("/");
    }

    // for each nested object, recursively iterate until the value is reached
    return Object.entries(value).flatMap(([_key, _value]) =>
      parse([...keys, _key], _value as TValue),
    );
  };

  return parse([], data) as string[];
}

/**
 * Upload a file or data URL to IPFS via NEAR Social
 * @param fileOrData The file to upload or a data URL/base64 string
 * @returns Promise resolving to the IPFS CID
 */
export async function uploadFileToIPFS(fileOrData: File | string): Promise<string> {
  try {
    const formData = new FormData();

    if (typeof fileOrData === "string") {
      // Handle data URL or base64 string
      // Convert data URL to blob
      let blob: Blob;

      if (fileOrData.startsWith("data:")) {
        // It's a data URL
        const response = await fetch(fileOrData);
        blob = await response.blob();
      } else {
        // Assume it's base64 data
        const byteString = atob(fileOrData.split(",")[1] || fileOrData);
        const mimeType = fileOrData.split(",")[0]?.split(":")[1]?.split(";")[0] || "image/jpeg";
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);

        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }

        blob = new Blob([ab], { type: mimeType });
      }

      // Create a File from the Blob
      const file = new File([blob], "image.jpg", { type: blob.type });
      formData.append("file", file);
    } else {
      // It's already a File object
      formData.append("file", fileOrData);
    }

    const response = await fetch("https://ipfs.near.social/add", {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.cid;
  } catch (error) {
    console.error("Error uploading file to IPFS:", getErrorMessage(error));
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Transforms post content for NEAR Social posting.
 * Combines text from multiple posts into a single string.
 * @param posts - Array of post content objects.
 * @returns A single string combining the text of all posts.
 */
export function transformNearSocialPost(posts: PostContent[]): string {
  const combinedText = posts.map((p) => p.text).join("\n\n");
  return combinedText;
}

export function validateAccountId(accountID: string): boolean {
  return (
    accountID.length >= 2 &&
    accountID.length <= 64 &&
    new RegExp(/^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/).test(accountID)
  );
}

export class NearSocialService {
  private social: NearSocialJS.Social;

  constructor() {
    this.social = new NearSocialJS.Social({
      contractId: SOCIAL_CONTRACT[NETWORK_ID],
      network: NETWORK_ID as Network,
    });
  }

  public async isWritePermissionGranted(options: {
    key: string;
    granteeAccountId?: string;
    granteePublicKey?: string;
  }): Promise<boolean> {
    return await this.social.isWritePermissionGranted(options);
  }

  async createPost(posts: PostContent[]): Promise<void> {
    const walletInstance = getWalletInstance();
    if (!walletInstance || !walletInstance.near || !walletInstance.accountId) {
      throw new Error("Wallet not connected");
    }

    const near = walletInstance.near;
    const accountId = walletInstance.accountId;

    let publicKey: string | null = null;
    try {
      if (walletInstance.connector) {
        const wallet = await walletInstance.connector.wallet();
        const accounts = await wallet.getAccounts();
        if (accounts && accounts.length > 0) {
          publicKey = accounts[0].publicKey.toString();
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("No accounts found")) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }
      console.error("Error getting public key:", error);
      throw new Error("Failed to get public key from wallet");
    }

    if (!publicKey) {
      throw new Error("Public key not available. Please ensure your wallet is connected.");
    }

    try {
      const combinedText = posts.map((p) => p.text).join("\n\n");

      const content = {
        type: "md",
        text: combinedText,
      };

      const data = {
        [accountId]: {
          post: {
            main: JSON.stringify(content),
          },
          index: {
            post: JSON.stringify({
              key: "main",
              value: {
                type: content.type,
              },
            }),
          },
        },
      };

      const keys = parseKeyFromData(data);

      for (const key of keys) {
        if (
          (key.split("/")[0] || "") !== accountId &&
          !(await this.isWritePermissionGranted({
            granteePublicKey: publicKey,
            key: key,
          }))
        ) {
          throw new Error(
            `the supplied public key has not been granted write permission for "${key}"`,
          );
        }
      }

      const transaction = this.social.set({
        signerId: accountId,
        data,
      });

      await near.transaction(accountId).add(transaction).send();
    } catch (error) {
      console.error("Error creating post:", getErrorMessage(error));

      if (isPlatformError(error)) {
        throw error;
      }

      throw new Error(getErrorMessage(error));
    }
  }
}
