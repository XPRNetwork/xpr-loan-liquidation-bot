import BigNumber from "bignumber.js";

export type TEosioMapEntry<Key, Value> = {
  key: Key;
  value: Value;
};

export type TAssetSymbol = {
  code: string;
  precision: number;
};

export type TAsset = {
  amount: BigNumber;
  symbol: TAssetSymbol;
};

export type TExtendedAsset = {
  amount: BigNumber;
  extSymbol: TExtendedSymbol;
};
export type TExtendedSymbol = {
  sym: TAssetSymbol;
  contract: string;
};
// how eosjs serializes this
export type TExtendedSymbolEosio = {
  sym: string;
  contract: string;
};

export type TShareRow = {
  account: string;
  tokens: TEosioMapEntry<TExtendedSymbolEosio, number>[];
};

type TBorrowSnapshotRow = any;
export type TBorrowRow = {
  account: string;
  tokens: TEosioMapEntry<TExtendedSymbolEosio, TBorrowSnapshot>[];
};

export type TAccountsRow = {
  balance: string;
};
