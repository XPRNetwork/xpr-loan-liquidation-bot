import { Api, Serialize } from "@proton/js";

export const sendTransaction = (api: Api) => async (
  actions: Serialize.Action[]
): Promise<{ transaction_id: string; processed: any }> => {
  try {
    const result = await api.transact(
      { actions },
      {
        useLastIrreversible: true,
        expireSeconds: 400
      }
    );
    return result as { transaction_id: string; processed: any };
  } catch (e: any) {
    if (
      e.json &&
      e.json.error &&
      e.json.error.details &&
      e.json.error.details.length
    ) {
      throw new Error(e.json.error.details[0].message);
    } else {
      throw e;
    }
  }
};

type GetTableRowsOptions = {
  json?: boolean;
  code?: string;
  scope?: string | number | null;
  table?: string;
  lower_bound?: number | string;
  upper_bound?: number | string;
  limit?: number;
  key_type?: string;
  index_position?: number | string;
  reverse?: boolean;
};

interface RpcLike {
  get_table_rows(options: any): Promise<{ rows: any[]; more: boolean; next_key?: string }>;
}

export const fetchAllRows = (rpc: RpcLike) => async <T>(
  options: GetTableRowsOptions
): Promise<T[]> => {
  const mergedOptions = {
    json: true,
    limit: -1,
    ...options,
  };

  let lowerBound = mergedOptions.lower_bound;

  let { rows, more, next_key } = await rpc.get_table_rows({
    ...mergedOptions,
    lower_bound: lowerBound,
  });

  if (more) {
    const moreRows = await fetchAllRows(rpc)({
      ...mergedOptions,
      lower_bound: next_key,
    })

    rows = rows.concat(moreRows);
  }

  return rows;
};
