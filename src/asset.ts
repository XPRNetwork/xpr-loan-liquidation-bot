import BigNumber from "bignumber.js";
import {
  TAsset,
  TAssetSymbol,
  TExtendedAsset,
  TExtendedSymbol,
} from "./@types/tables";

type FormatOptions = {
  withSymbol?: boolean;
  separateThousands?: boolean;
};

export type FormattableAsset = {
  amount: number | BigNumber;
  symbol: TAssetSymbol;
};

// https://stackoverflow.com/a/2901298/9843487
const separateThousands = (s: string | number) =>
  String(s).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/**
 * Example:
 * { amount: 1230000, symbol: { symbolCode: 'DAPP', precision: 4 }} => '123.0000 DAPP'
 */
export function formatAsset(
  { amount, symbol }: FormattableAsset,
  formatOptions?: FormatOptions
): string {
  const options: FormatOptions = {
    withSymbol: true,
    separateThousands: false,
    ...(formatOptions || {}),
  };
  const { precision, code } = symbol;

  // amount is supposed to be an uint64, so cut off any decimals
  let s = (amount instanceof BigNumber
    ? amount.toString()
    : String(amount)
  ).split(`.`)[0];
  const sign = /-/i.test(s) ? -1 : 1;
  if (sign === -1) {
    s = s.replace(/-/gi, ``);
  }
  while (s.length < precision + 1) {
    s = `0${s}`;
  }

  let pre = s.slice(0, precision === 0 ? undefined : -precision);
  const decimals = precision === 0 ? `` : s.slice(-precision);

  if (options.separateThousands) {
    // adds `,` thousand separators
    pre = separateThousands(pre);
  }

  let result = pre;
  if (decimals) result = `${result}.${decimals}`;
  if (options.withSymbol) result = `${result} ${code}`;

  if (sign === -1) result = `-${result}`;
  return result;
}

/**
 * Example
 * '123.0000 DAPP' => { amount: 1230000, symbol: { symbolCode: 'DAPP', precision: 4 }}
 */
export function decomposeAsset(assetString: string): TAsset {
  try {
    const [amountWithPrecision, symbolName] = assetString.split(` `);
    if (!amountWithPrecision || !symbolName) {
      throw new Error(`Invalid split`);
    }

    const dotIndex = amountWithPrecision.indexOf(`.`);
    let precision = 0;
    if (dotIndex !== -1) {
      precision = amountWithPrecision.length - dotIndex - 1;
    }

    const amountNoPrecision = new BigNumber(
      amountWithPrecision.replace(`.`, ``),
      10
    );

    return {
      amount: amountNoPrecision,
      symbol: {
        precision,
        code: symbolName,
      },
    };
  } catch (error) {
    throw new Error(
      `Invalid asset passed to decomposeAsset: ${JSON.stringify(
        assetString
      )}. ${error.message}`
    );
  }
}

export const asset2dec = (quantity: TAsset): number => {
  return quantity.amount
    .div(new BigNumber(`10`).pow(quantity.symbol.precision))
    .toNumber();
};

export const dec2asset = (val: number, symbol: TAssetSymbol): TAsset => {
  const amount = new BigNumber(val).times(
    new BigNumber(`10`).pow(symbol.precision)
  );
  return {
    amount,
    symbol,
  };
};

export const asset2extAsset = (
  asset: TAsset,
  contract: string
): TExtendedAsset => {
  return {
    amount: asset.amount,
    extSymbol: {
      sym: asset.symbol,
      contract,
    },
  };
};
export const extAsset2asset = (extAsset: TExtendedAsset): TAsset => {
  return {
    amount: extAsset.amount,
    symbol: extAsset.extSymbol.sym,
  };
};

export const dec2extAsset = (
  val: number,
  extSymbol: TExtendedSymbol
): TExtendedAsset => {
  return asset2extAsset(dec2asset(val, extSymbol.sym), extSymbol.contract);
};

export const extAsset2dec = (extAsset: TExtendedAsset): number => {
  return asset2dec(extAsset2asset(extAsset));
};
