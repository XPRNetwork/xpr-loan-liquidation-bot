import BigNumber from 'bignumber.js'

export type TEosioMap<Key, Value> = {
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

export type TExtendedSymbol = {
  sym: string;
  contract: string;
};
export type TExtendedAsset = {
  amount: BigNumber;
  extSymbol: TExtendedSymbol;
};
// serialized as EOSIO does it
export type TExtendedSymbolEosio = {
  sym: TAssetSymbol;
  contract: string;
};
// serialized as EOSIO does it
export type TExtendedAssetEosio = {
  quantity: string;
  contract: string;
};

export type TBorrowRow = {
  account: string;
  tokens: TEosioMap<TExtendedSymbol, number>[];
};
