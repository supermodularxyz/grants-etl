import { getAddress, isAddress } from 'viem'
import { PrismaClient, UserTx } from '@prisma/client'
import { UserTxManager, supportedTxChains } from '../utils/tx'
import Queue from 'bull'

type Props = {
  chainId: string
  prisma: PrismaClient
}

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

type UserTxData = Omit<UserTx, 'id' | 'mainAddress'>

const managerUserTxHistory = async ({ prisma, chainId }: Props): Promise<any> => {
  if (!supportedTxChains[Number(chainId)]) {
    console.log(`No Tx manager found for ${chainId}`)
    return
  }

  // load all users count
  const voters = await prisma.vote.findMany({
    distinct: ['voter'],
    where: {
      chainId: Number(chainId),
    },
    select: {
      id: true,
      voter: true,
    },
  })

  const votersCount = voters.length

  console.log(`Indexing ${votersCount} voters`)
  console.time('history')

  if (votersCount === 0) {
    console.log(`No voters found`)
    return
  }

  // create Queue
  const userTxQueue = new Queue('userTxHistory')

  const txHandler = new UserTxManager(Number(chainId))

  const concurrencyRate = Number(chainId) === 424 ? 20 : 100
  // const concurrencyRate = 1

  userTxQueue.process(concurrencyRate, async (job: Queue.Job<{ id: number; voter: string }>) => {
    const { data: user } = job
    const { voter: address } = user

    const tx = await txHandler.load(user.voter)
    let data: Omit<UserTx, 'id'>[] = []

    let extraTxData: UserTxData[] = []

    const rowBlocks = new Set(tx.items.map((i) => Number(i.block)))

    console.log({ address })

    const userLatestTx = await prisma.userTx.findFirst({
      where: {
        OR: [{ from: address.toLowerCase() }, { from: address }, { to: address.toLowerCase() }, { to: address }],
      },
      orderBy: {
        block: 'desc',
      },
    })

    if (!tx.items) {
      console.log(`Empty Reponse Items for ${address}`)
    }

    const lastBlock = Number(userLatestTx?.block ?? 0)
    const foundLastKnownBlock = rowBlocks.has(lastBlock)

    if (foundLastKnownBlock) {
      console.log(`Last known block data found in new user tx records`)
    }

    if (lastBlock === [...rowBlocks][0]) {
      console.log(`Have latest tx data for ${address}`)
    } else {
      if (!userLatestTx?.block || !foundLastKnownBlock) {
        console.log(`${address} has newer tx records, requesting more data`)
        if (tx.hasMore) {
          extraTxData = await txHandler.loadMore(
            address,
            'next_page_params' in tx ? tx.next_page_params : tx.nextPageToken,
            lastBlock
          )

          console.log(`Loaded extraTxData`)
        }
      }

      const txData = [...extraTxData, ...tx.items]

      if (txData) {
        for (let i = 0; i < txData.length; i++) {
          const item = txData[i]

          const [newAddress, mainAddress] = (address === item.to ? [item.from, item.to] : [item.to, item.from]) ?? ''
          if (isAddress(newAddress)) {
            await prisma.user.upsert({
              where: {
                address: getAddress(newAddress),
              },
              create: {
                address: getAddress(newAddress),
              },
              update: {},
            })
          }

          data.push({ ...item, mainAddress })
        }
      }
    }

    if (data.length > 0) {
      console.log(`Row grouping completed, ${data.length} groups found. Creating data chunks`)

      const chunkSize = 300
      const chunks = []

      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize)
        chunks.push(chunk)
      }

      console.log(`Data chunks done, writing chunks to database`)

      for (const chunk of chunks) {
        await prisma.userTx.createMany({
          data: chunk,
          skipDuplicates: true,
        })
      }
    }

    console.timeLog(`TxHistory ${address}`)

    return Promise.resolve(true)
  })

  userTxQueue.on('drained', () => {
    console.log(`Queue is empty`)
    userTxQueue.close()
  })

  // Add voters to queue
  for (const voter of voters) {
    userTxQueue.add(voter)
  }
}

export default managerUserTxHistory
