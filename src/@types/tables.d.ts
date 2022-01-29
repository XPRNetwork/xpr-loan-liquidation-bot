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

export type TMarketRow = {
  share_symbol: TExtendedSymbolEosio;
  underlying_symbol: TExtendedSymbolEosio;
  variable_interest_model: any;
  stable_interest_model: any;
  collateral_factor: number;
  reserve_factor: number;
  borrow_index: number;
  average_stable_rate: number;
  stable_loans_enabled: boolean;
  max_stable_borrow_percentage: number;
  variable_accrual_time: string;
  stable_accrual_time: string;
  total_variable_borrows: any;
  total_stable_borrows: any;
  total_reserves: any;
  oracle_feed_index: number;
};

type TBorrowSnapshotRow = any;
export type TBorrowRow = {
  account: string;
  tokens: TEosioMapEntry<TExtendedSymbolEosio, TBorrowSnapshot>[];
};

export type TAccountsRow = {
  balance: string;
};

export type Liquidation = {
  user: string;
  debtExtAsset: TExtendedAsset;
  seizeSymbol: string;
};
