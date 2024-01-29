import { getAddress, isAddress } from 'viem'
import { loadExtraTxData } from '../utils'
import { PrismaClient } from '@prisma/client'
import { explorers } from '../utils/client'

type Props = {
  chainId: string
  prisma: PrismaClient
}

export type InternalRow = {
  timestamp: Date
  block: number
  success: boolean
  transaction_hash: string
  value: string
  type: string
  to?: {
    name: string
    hash: string
  }
  from: {
    name: string
    hash: string
  }
  gas_limit: number
  // token_transfers
}

type UserTxData = {
  timestamp: Date
  block: number
  success: boolean
  hash: string
  type: string
  value: string
  to: string
  toName: string
  from: string
  fromName: string
  gasLimit: number
  chainId: number
}

const managerUserInternalTxHistory = async ({ prisma, chainId }: Props): Promise<any> => {
  const explorerForChain = explorers[Number(chainId)]

  if (!explorerForChain || explorerForChain.length === 0) {
    console.log(`No explorer found for ${chainId}`)
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
    console.log(`No users found`)
    return
  }

  // split voters list into chunks
  const votersGroup = []

  for (let i = 0; i < voters.length; i += 20) {
    const chunk = voters.slice(i, i + 20)
    votersGroup.push(chunk)
  }

  let cursor = 0

  do {
    try {
      console.time('Index')

      const users: { id: number; voter: string }[] = votersGroup[cursor]

      if (!users || users.length === 0) {
        break
      }

      const rawTxs = (await Promise.all(
        users.map((user) =>
          fetch(`${explorerForChain}/api/v2/addresses/${user.voter}/internal-transactions?filter=to%20%7C%20from`).then(
            async (r) => ({ address: user.voter, response: await r.json() })
          )
        )
      )) as {
        address: string
        response: {
          items: InternalRow[]
          next_page_params?: any
        }
      }[]

      console.log(`Explorer request completed, starting row grouping`)

      const data: UserTxData[] = []

      for (const row of rawTxs) {
        let extraTxData: InternalRow[] = []

        const rowBlocks = new Set(row.response.items.map((i) => i.block))

        // Make sure new data is coming from current user request by checking against last updated tx record
        const userLatestTx = await prisma.userInternalTx.findFirst({
          where: {
            AND: [{ from: row.address }, { to: row.address }],
          },
          orderBy: {
            block: 'desc',
          },
        })

        if (!row.response.items) {
          console.log(`Empty Reponse Items for ${row.address}`)
        }

        const lastBlock = Number(userLatestTx?.block) ?? 0

        if (!userLatestTx?.block || !rowBlocks.has(lastBlock)) {
          console.log(`${row.address} has newer tx records, requesting more data`)
          if (row.response.next_page_params) {
            extraTxData = (await loadExtraTxData({
              url: `${explorerForChain}/api/v2/addresses/${row.address}/internal-transactions?filter=to%20%7C%20from`,
              next_page_params: row.response.next_page_params,
              lastBlock,
            })) as InternalRow[]

            console.log(`Loaded extraTxData`)
          }
        }

        const txData = [...extraTxData, ...row.response.items]

        if (txData) {
          for (let i = 0; i < txData.length; i++) {
            const item = txData[i]

            const newAddress = (row.address === item.to?.hash ? item.from.hash : item.to?.hash) ?? ''
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

            data.push({
              timestamp: item.timestamp ?? new Date(0).toISOString(),
              block: item.block ?? 0,
              hash: item.transaction_hash,
              value: item.value,
              toName: item.to?.name ?? '',
              fromName: item.from?.name ?? '',
              to: item.to?.hash ?? '',
              from: item.from.hash,
              gasLimit: Number(item.gas_limit) ?? 0,
              chainId: Number(chainId),
              success: item.success,
              type: item.type,
            })
          }
        }
      }

      console.log(`Row grouping completed, ${data.length} groups found. Creating data chunks`)

      const chunkSize = 300
      const chunks = []

      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize)
        chunks.push(chunk)
      }

      console.log(`Data chunks done, writing chunks to database`)

      for (const chunk of chunks) {
        await prisma.userInternalTx.createMany({
          data: chunk,
          skipDuplicates: true,
        })
      }

      cursor = users[users.length - 1].id

      console.log(`At user index ${cursor}`)
      console.timeEnd('Index')
      console.timeLog('history')
    } catch (error) {
      console.log(error)

      console.log(`Something failed, retrying in few seconds...`)
      await new Promise((res, rej) => setTimeout(res, 60000))
    }
  } while ((cursor as number) > 0)
}

export default managerUserInternalTxHistory
