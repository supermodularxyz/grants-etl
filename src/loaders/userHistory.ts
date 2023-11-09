import { PrismaClient } from '@prisma/client'
import { QueryParameter, DuneClient } from '@cowprotocol/ts-dune-client'

type Props = {
  chainId?: string
  prisma: PrismaClient
}

type Row = {
  wallet: string
  direction: 'outgoing' | 'incoming'
  block_number: number[]
  block_time: Date[]
  tx_hash: string[]
  neighbor_address: string[]
  symbol: string[]
  token_amount: number[]
  chain: string[]
}

const managerUserHistory = async ({ prisma }: Props): Promise<any> => {
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
      take: 200,
      orderBy: {
        id: 'asc',
      },
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
    })

    if (users.length === 0) {
      break
    }

    cursor = users[users.length - 1].id

    const userAddresses = users.map((u) => u.address).join(', ')

    const client = new DuneClient(process.env.DUNE_API_KEY ?? '')
    const duneRes = await client.refresh(2974152, [QueryParameter.text('wallet_list', userAddresses)])

    console.log(`Dune request completed, starting row grouping`)

    const rows = (duneRes.result?.rows || []) as Row[]

    const data = []

    for (const row of rows) {
      if (row.block_number) {
        for (let i = 0; i < row.block_number.length; i++) {
          data.push({
            wallet: row.wallet,
            direction: row.direction,
            block_number: row.block_number[i] || 0,
            block_time: new Date(row.block_time[i]).toISOString(),
            tx_hash: row.tx_hash[i] || '',
            neighbor_address: row.neighbor_address[i] || '',
            symbol: row.symbol[i] || '',
            token_amount: row.token_amount[i] || 0,
            chain: row.chain[i] || '',
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
      await prisma.userHistory.createMany({
        data: chunk,
      })
    }

    console.log(`At user index ${cursor}`)
    console.timeEnd('Index')
    console.timeLog('history')
  } while ((cursor as number) > 0)
}

export default managerUserHistory
