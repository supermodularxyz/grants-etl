import { getAddress, isAddress } from 'viem'
import { loadExtraTxData } from '../utils'
import { PrismaClient } from '@prisma/client'

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
  // load all users count
  const userCount = await prisma.user.count()

  console.log(`Indexing ${userCount} users`)
  console.time('history')

  if (userCount === 0) {
    console.log(`No users found`)
    return
  }

  let cursor

  do {
    try {
      console.time('Index')
      // pick off users based on id and increment till end of list
      // const users: { id: number; address: string }[] = await prisma.user.findMany({
      //   take: 1,
      //   orderBy: {
      //     id: 'asc',
      //   },
      //   ...(cursor && { skip: 1, cursor: { id: cursor } }),
      // })

      const users: { id: number; voter: string }[] = await prisma.vote.findMany({
        where: {
          chainId: Number(chainId),
        },
        select: {
          id: true,
          voter: true,
        },
        distinct: ['voter'],
        take: 20,
        orderBy: {
          id: 'asc',
        },
        ...(cursor && { skip: 1, cursor: { id: cursor } }),
      })

      if (users.length === 0) {
        break
      }

      const rawTxs = (await Promise.all(
        users.map((user) =>
          fetch(
            `https://explorer.publicgoods.network/api/v2/addresses/${user.voter}/internal-transactions?filter=to%20%7C%20from`
          ).then(async (r) => ({ address: user.voter, response: await r.json() }))
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

        if (row.response.next_page_params) {
          extraTxData = (await loadExtraTxData({
            url: `https://explorer.publicgoods.network/api/v2/addresses/${row.address}/internal-transactions?filter=to%20%7C%20from`,
            next_page_params: row.response.next_page_params,
          })) as InternalRow[]

          console.log(`Loaded extraTxData`)
        }

        if (!row.response.items) {
          console.log(`Empty Reponse Items for ${row.address}`)
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
