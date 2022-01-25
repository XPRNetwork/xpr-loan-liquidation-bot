import { Api, JsonRpc, Serialize } from "@protonprotocol/protonjs";

export const sendTransaction = (api: Api) => async (
  actions: Serialize.Action[]
): Promise<{ transaction_id: string; processed: any }> => {
  // console.log(JSON.stringify(actions, null, 2))
  try {
    const result = await api.transact(
      { actions },
      {
        useLastIrreversible: true,
        expireSeconds: 400,
      }
    );
    return result;
  } catch (e) {
    if (e.json && e.json.error && e.json.error.details && e.json.error.details.length) {
      throw new Error(e.json.error.details[0].message);
    } else {
      throw e;
    }
  }
};

type GetTableRowsOptions = {
  json?: boolean;
  code?: string;
  scope?: string;
  table?: string;
  lower_bound?: number | string;
  upper_bound?: number | string;
  limit?: number;
  key_type?: string;
  index_position?: number | string;
  reverse?: boolean;
};

const MAX_PAGINATION_FETCHES = 20;
export const fetchAllRows = (rpc: JsonRpc) => async <T>(
  options: GetTableRowsOptions
): Promise<T[]> => {
  const mergedOptions = {
    json: true,
    limit: 9999,
    ...options,
  };

  let rows: T[] = [];
  let lowerBound = mergedOptions.lower_bound;

  for (let i = 0; i < MAX_PAGINATION_FETCHES; i += 1) {
    const result = await rpc.get_table_rows({
      ...mergedOptions,
      lower_bound: lowerBound,
    });
    rows = rows.concat(result.rows);

    if (!result.more || result.rows.length === 0) break;

    // EOS 2.0 api
    if (typeof result.next_key !== `undefined`) {
      lowerBound = result.next_key;
    } else {
      throw new Error(`requires EOSIO >= v2`);
    }
  }

  return rows;
};
