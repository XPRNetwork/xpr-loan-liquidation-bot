export type TEosioMap<Key, Value> = {
  key: Key;
  value: Value;
};

export type TExtendedSymbol = {
  sym: string;
  contract: string;
};

export type TBorrowRow = {
  account: string;
  tokens: TEosioMap<TExtendedSymbol, number>[];
};
