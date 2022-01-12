import { Api } from "@protonprotocol/protonjs";
import {
  TAccountsRow,
  TBorrowSnapshotRow,
  TEosioMapEntry,
  TExtendedAsset,
  TExtendedSymbol,
  TExtendedSymbolEosio,
  TMarketRow,
  TShareRow,
} from "./@types/tables";
import { LENDING_CONTRACT } from "./constants";
import { fetchAllRows } from "./transaction";
import _ from "lodash";
import { decomposeAsset, formatAsset } from "./asset";
import BigNumber from "bignumber.js";

export const fetchAllBorrowers = async (api: Api) => {
  // get all borrowers because if a user can be liquidated they must have borrowed
  // something
  const rows = await fetchAllRows(api.rpc)<TBorrowSnapshotRow>({
    code: LENDING_CONTRACT,
    scope: LENDING_CONTRACT,
    table: `borrows`,
  });
  return rows.map((row) => row.account);
};

export const fetchShares = (api: Api) => async (
  user: string
): Promise<TExtendedAsset[]> => {
  const rows = await fetchAllRows(api.rpc)<TShareRow>({
    lower_bound: user,
    upper_bound: user,
    key_type: `name`,
    code: LENDING_CONTRACT,
    scope: LENDING_CONTRACT,
    table: `shares`,
  });
  if (!rows[0]) return [];

  return rows[0].tokens.map((entry) => {
    return {
      amount: new BigNumber(entry.value),
      extSymbol: {
        sym: {
          code: entry.key.sym.split(`,`)[1],
          precision: Number.parseInt(entry.key.sym.split(` `)[0]),
        },
        contract: entry.key.contract,
      },
    };
  });
};

export const fetchMarkets = (api: Api) => async (): Promise<any[]> => {
  const rows = await fetchAllRows(api.rpc)<TMarketRow>({
    code: LENDING_CONTRACT,
    scope: LENDING_CONTRACT,
    table: `markets`,
  });

  if (!rows) return [];

  return rows.map((row) => {
    return {
      ...row,
      share_symbol: {
        sym: {
          code: row.share_symbol.sym.split(`,`)[1],
          precision: Number.parseInt(row.share_symbol.sym.split(` `)[0]),
        },
        contract: row.share_symbol.contract,
      },
      underlying_symbol: {
        sym: {
          code: row.underlying_symbol.sym.split(`,`)[1],
          precision: Number.parseInt(row.underlying_symbol.sym.split(` `)[0]),
        },
        contract: row.underlying_symbol.contract,
      }
    };
  });
};

export const fetchBalance = (api: Api) => async (
  user: string,
  extSymbol: TExtendedSymbol
): Promise<TExtendedAsset> => {
  const rows = await fetchAllRows(api.rpc)<TAccountsRow>({
    code: extSymbol.contract,
    scope: user,
    table: `accounts`,
  });
  const found = rows.find(
    (row) => decomposeAsset(row.balance).symbol.code === extSymbol.sym.code
  );

  const quantity = found
    ? found.balance
    : formatAsset({ amount: 0, symbol: extSymbol.sym });
  return {
    amount: decomposeAsset(quantity).amount,
    extSymbol: extSymbol,
  };
};

export const getMapValue = <K = any, V = any>(
  map: TEosioMapEntry<K, V>[],
  key: K
) => {
  const found = map.find((entry) => _.isEqual(entry.key, key));
  return found ? found.value : undefined;
};
