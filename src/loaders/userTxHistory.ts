import { getAddress, isAddress } from 'viem'
import { PrismaClient, UserTx } from '@prisma/client'
import { UserTxManager, supportedTxChains } from '../utils/tx'

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

  // split voters list into chunks
  const votersGroup = []

  const chunkSize = Number(chainId) === 424 ? 20 : 200

  for (let i = 0; i < voters.length; i += chunkSize) {
    const chunk = voters.slice(i, i + chunkSize)
    votersGroup.push(chunk)
  }

  const txHandler = new UserTxManager(Number(chainId))

  let cursor = 0

  do {
    try {
      console.time('Index')

      const users: { id: number; voter: string }[] = votersGroup[cursor]

      if (!users || users.length === 0) {
        break
      }

      const tx = await Promise.all(users.map((user) => txHandler.load(user.voter)))

      console.log(`Explorer request completed, starting row grouping`)

      let data: Omit<UserTx, 'id'>[] = []

      // TODO : Parallelize this process for all row in tx
      await Promise.all(
        tx.map(async (row) => {
          let extraTxData: UserTxData[] = []

          const rowBlocks = new Set(row.items.map((i) => Number(i.block)))

          console.log({ address: row.address })

          const userLatestTx = await prisma.userTx.findFirst({
            where: {
              OR: [
                { from: row.address.toLowerCase() },
                { from: row.address },
                { to: row.address.toLowerCase() },
                { to: row.address },
              ],
            },
            orderBy: {
              block: 'desc',
            },
          })

          if (!row.items) {
            console.log(`Empty Reponse Items for ${row.address}`)
          }

          const lastBlock = Number(userLatestTx?.block ?? 0)
          const foundLastKnownBlock = rowBlocks.has(lastBlock)

          if (foundLastKnownBlock) {
            console.log(`Last known block data found in new user tx records`)
          }

          if (lastBlock === [...rowBlocks][0]) {
            console.log(`Have latest tx data for ${row.address}`)
          } else {
            if (!userLatestTx?.block || !foundLastKnownBlock) {
              console.log(`${row.address} has newer tx records, requesting more data`)
              if (row.hasMore) {
                extraTxData = await txHandler.loadMore(
                  row.address,
                  'next_page_params' in row ? row.next_page_params : row.nextPageToken,
                  lastBlock
                )

                console.log(`Loaded extraTxData`)
              }
            }

            const txData = [...extraTxData, ...row.items]

            if (txData) {
              for (let i = 0; i < txData.length; i++) {
                const item = txData[i]

                const [newAddress, mainAddress] =
                  (row.address === item.to ? [item.from, item.to] : [item.to, item.from]) ?? ''
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
        })
      )

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

      cursor += 1

      console.log(`At user index ${cursor}`)
      console.timeEnd('Index')
      console.timeLog('history')
    } catch (error) {
      console.log(`Something failed, retrying in few seconds...`)
      await new Promise((res, rej) => setTimeout(res, 20000))
    }
  } while ((cursor as number) > 0)
}

export default managerUserTxHistory
