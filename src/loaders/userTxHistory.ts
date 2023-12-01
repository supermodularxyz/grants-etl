import { PrismaClient } from '@prisma/client'

type Props = {
  chainId: string
  prisma: PrismaClient
}

type Row = {
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
    console.time('Index')
    // pick off users based on id and increment till end of list
    const users: { id: number; address: string }[] = await prisma.user.findMany({
      take: 1,
      orderBy: {
        id: 'asc',
      },
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
    })

    if (users.length === 0) {
      break
    }

    cursor = users[users.length - 1].id

    const rawTxs = (await Promise.all(
      users.map((user) =>
        fetch(
          `https://explorer.publicgoods.network/api/v2/addresses/${user.address}/transactions?filter=to%20%7C%20from`
        ).then((r) => r.json())
      )
    )) as {
      items: Row[]
      next_page_params?: any
    }[]

    console.log(`Explorer request completed, starting row grouping`)

    const data: UserTxData[] = []

    for (const row of rawTxs) {
      if (row.items) {
        for (let i = 0; i < row.items.length; i++) {
          const item = row.items[i]

          data.push({
            timestamp: item.timestamp,
            block: item.block,
            status: item.status,
            method: item.method,
            hash: item.hash,
            value: item.value,
            toName: item.to?.name ?? '',
            fromName: item.from?.name ?? '',
            to: item.to?.hash ?? '',
            from: item.from.hash,
            gasUsed: item.gas_used,
            nonce: item.nonce,
            chainId: Number(chainId),
            // token_transfers
          })
        }
      }

      if (row.next_page_params) {
        console.log(row.next_page_params)
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

    console.log(`At user index ${cursor}`)
    console.timeEnd('Index')
    console.timeLog('history')
  } while ((cursor as number) > 0)
}

export default managerUserTxHistory
