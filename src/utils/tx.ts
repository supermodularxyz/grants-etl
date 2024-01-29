import { AnkrProvider, Blockchain, Transaction } from '@ankr.com/ankr.js'
import { UserTx } from '@prisma/client'

export type UserTxData = Omit<UserTx, 'id' | 'mainAddress'>

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
  loadMore: (address: string, lastParam: number, params?: string) => Promise<UserTxData[]>
  transform: (data: any) => UserTxData[]
}

export const supportedTxChains: Record<number, string> = {
  1: 'eth',
  10: 'optimism',
  137: 'polygon',
  250: 'fantom',
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

  async loadMore(address: string, fromBlock: number, params?: string) {
    let _nextPageToken = params
    let data: UserTxData[] = []
    do {
      const { transactions, nextPageToken } = await this.provider.getTransactionsByAddress({
        blockchain: this.chain as Blockchain,
        address: [address],
        pageSize: 10000,
        descOrder: true,
        fromBlock,
        ...(_nextPageToken ? { pageToken: _nextPageToken } : {}),
      })

      const resTx = this.transform(transactions)

      _nextPageToken = nextPageToken
      data = [...data, ...resTx]
    } while (_nextPageToken.length > 0)

    return data
  }

  transform(data: Transaction[]) {
    return data.map((item) => ({
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
    }))
  }
}
