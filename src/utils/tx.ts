import { AnkrProvider, Blockchain, Transaction } from '@ankr.com/ankr.js'
import { UserTx } from '@prisma/client'
import { loadExtraTxData } from '.'

export type UserTxData = Omit<UserTx, 'id' | 'mainAddress'>

export type Row = {
  timestamp: Date
  block: number
  status: string
  method: string | null
  hash: string
  value: string
  to?: {
    name: string
    hash: string
  }
  from: {
    name: string
    hash: string
  }
  gas_used: number
  nonce: number
  // token_transfers
}

type LoadResponse = {
  items: UserTxData[]
  hasMore: boolean
  nextPageToken?: string
  next_page_params?: any
}

export interface Tx {
  chain: Blockchain
  chainId: number
  provider: AnkrProvider
  chains: Record<number, string>
  load: (address: string) => Promise<
    LoadResponse & {
      address: string
    }
  >
  loadMore: (address: string, params: any, lastParam: number) => Promise<UserTxData[]>
  transform: (data: any) => UserTxData[]
}

export const supportedTxChains: Record<number, string> = {
  1: 'eth',
  10: 'optimism',
  137: 'polygon',
  250: 'fantom',
  424: 'https://explorer.publicgoods.network',
  42161: 'arbitrum',
}

export class UserTxManager implements Tx {
  chainId = 1
  chain = 'eth' as Blockchain

  provider = new AnkrProvider(process.env.ANKR_PROVIDER as string)

  chains = { ...supportedTxChains }

  constructor(chainId: number) {
    this.chainId = chainId
    this.chain = this.chains[chainId] as Blockchain
  }

  async load(address: string) {
    const req =
      this.chainId === 424
        ? fetch(`${this.chain}/api/v2/addresses/${address}/transactions?filter=to%20%7C%20from`).then(async (r) => {
            const responseData = (await r.json()) as { next_page_params: any; items: Row[] }

            const items: UserTxData[] = this.transform(responseData.items)

            return {
              next_page_params: responseData.next_page_params,
              hasMore: responseData.next_page_params !== null,
              items,
            }
          })
        : this.provider
            .getTransactionsByAddress({
              blockchain: this.chain,
              address: [address],
              pageSize: 10000,
              descOrder: true,
            })
            .then((resp) => {
              const items: UserTxData[] = this.transform(resp.transactions)

              return { nextPageToken: resp.nextPageToken, hasMore: resp.nextPageToken.length > 0, items }
            })

    return await req.then((data) => ({ address, ...data }))
  }

  async loadMore(address: string, params: any, lastBlock: number) {
    if (this.chainId === 424) {
      return loadExtraTxData({
        url: `${this.chain}/api/v2/addresses/${address}/transactions?filter=to%20%7C%20from`,
        next_page_params: params,
        lastBlock,
      }).then((data) => this.transform(data as Row[]))
    } else {
      let nextPageToken = params
      let data: UserTxData[] = []
      do {
        const res = await this.provider.getTransactionsByAddress({
          blockchain: this.chain,
          address: [address],
          pageSize: 10000,
          descOrder: true,
        })
        const resTx = this.transform(res.transactions)

        const lastTx = resTx.find((i) => Number(i.block) === lastBlock)

        nextPageToken = lastTx ? '' : res.nextPageToken
        data = [...data, ...resTx]
      } while (nextPageToken.lenth > 0)

      return data
    }
  }

  transform(data: Row[] | Transaction[]) {
    return data.map((item) => {
      return 'block' in item
        ? {
            timestamp: item.timestamp ?? new Date(0).toISOString(),
            block: BigInt(item.block ?? 0),
            status: item.status ?? 'pending',
            method: item.method,
            hash: item.hash,
            value: item.value,
            toName: item.to?.name ?? '',
            fromName: item.from?.name ?? '',
            to: (item.to?.hash ?? '').toLowerCase(),
            from: item.from.hash.toLowerCase(),
            gasUsed: BigInt(item.gas_used ?? 0),
            nonce: item.nonce,
            chainId: Number(this.chainId),
            internalTxIndexed: false,
          }
        : {
            timestamp: new Date(Number(BigInt(item.timestamp ?? '0') * BigInt('1000'))),
            block: BigInt(item.blockNumber ?? '0'),
            status: item.status ?? 'pending',
            method: item.method?.name ?? '',
            hash: item.hash ?? '',
            value: BigInt(item.value).toString(),
            toName: '',
            fromName: '',
            to: (item.to ?? '').toLowerCase(),
            from: (item.from ?? '').toLowerCase(),
            gasUsed: BigInt(item.gasUsed ?? '0'),
            nonce: Number(BigInt(item.nonce ?? '0').toString()),
            chainId: Number(this.chainId),
            internalTxIndexed: false,
          }
    })
  }
}
