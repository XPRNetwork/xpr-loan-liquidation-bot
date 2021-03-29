import { Api } from '@protonprotocol/protonjs'
import { TBorrowRow } from './@types/tables'
import { LENDING_CONTRACT } from './constants'
import { fetchAllRows } from './transaction'

export const fetchAllBorrowers = async (api: Api) => {
    // get all borrowers because if a user can be liquidated they must have borrowed
    // something
    const rows = await fetchAllRows(api.rpc)<TBorrowRow>({
        code: LENDING_CONTRACT,
        scope: LENDING_CONTRACT,
        table: `shares`,
    })
    return rows.map(row => row.account);
}
