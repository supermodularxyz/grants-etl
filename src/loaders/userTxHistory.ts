import { getAddress, isAddress } from 'viem'
import { loadExtraTxData } from '../utils'
import { PrismaClient } from '@prisma/client'
import { explorers } from '../utils/client'

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

type UserTxData = {
  timestamp: Date
  block: number
  status: string
  method: string | null
  hash: string
  value: string
  toName: string
  fromName: string
  to: string
  from: string
  gasUsed: number
  nonce: number
  chainId: number
}

const managerUserTxHistory = async ({ prisma, chainId }: Props): Promise<any> => {
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
    console.log(`No voters found`)
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
          fetch(`${explorerForChain}/api/v2/addresses/${user.voter}/transactions?filter=to%20%7C%20from`).then(
            async (r) => ({ address: user.voter, response: await r.json() })
          )
        )
      )) as {
        address: string
        response: {
          items: Row[]
          next_page_params?: any
        }
      }[]

      console.log(`Explorer request completed, starting row grouping`)

      const data: UserTxData[] = []

      for (const row of rawTxs) {
        let extraTxData: Row[] = []

        const rowBlocks = new Set(row.response.items.map((i) => i.block))

        // Make sure new data is coming from current user request by checking against last updated tx record
        const userLatestTx = await prisma.userTx.findFirst({
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
              url: `${explorerForChain}/api/v2/addresses/${row.address}/transactions?filter=to%20%7C%20from`,
              next_page_params: row.response.next_page_params,
              lastBlock,
            })) as Row[]

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
              status: item.status ?? 'pending',
              method: item.method,
              hash: item.hash,
              value: item.value,
              toName: item.to?.name ?? '',
              fromName: item.from?.name ?? '',
              to: item.to?.hash ?? '',
              from: item.from.hash,
              gasUsed: item.gas_used ?? 0,
              nonce: item.nonce,
              chainId: Number(chainId),
              // token_transfers
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
        await prisma.userTx.createMany({
          data: chunk,
          skipDuplicates: true,
        })
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
