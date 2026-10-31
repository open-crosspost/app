interface EVMChain {
  chainId: number;
  name: string;
  explorer: string;
  rpc: string;
}

const OUTLAYER_X_DEFAULT_PROJECT = "connectors.outlayer.near/x";

declare global {
  interface ImportMetaEnv {
    X_CONNECTOR_PROJECT?: string;
  }
}

/**
 * The connector project the GM campaign's X leg calls — `owner/name`
 * (the preview project) until OutLayer's curation activates
 * `connectors.outlayer.near/x`.
 */
export const X_CONNECTOR_PROJECT =
  import.meta.env.X_CONNECTOR_PROJECT ?? OUTLAYER_X_DEFAULT_PROJECT;

interface EVMWalletChains {
  [key: string]: EVMChain;
}

const evmWalletChains: EVMWalletChains = {
  mainnet: {
    chainId: 397,
    name: "Near Mainnet",
    explorer: "https://eth-explorer.near.org",
    rpc: "https://eth-rpc.mainnet.near.org",
  },
  testnet: {
    chainId: 398,
    name: "Near Testnet",
    explorer: "https://eth-explorer-testnet.near.org",
    rpc: "https://eth-rpc.testnet.near.org",
  },
};

export const NETWORK_ID = "mainnet";
export const EVMWalletChain = evmWalletChains[NETWORK_ID];

// Authentication configuration
export const AUTH_STORAGE_PREFIX = "crosspost_auth_";
