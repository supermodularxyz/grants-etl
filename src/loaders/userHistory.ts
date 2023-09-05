import { PrismaClient } from '@prisma/client'
import { QueryParameter, DuneClient } from '@cowprotocol/ts-dune-client'

type Props = {
  chainId: string
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

const client = new DuneClient(process.env.DUNE_API_KEY ?? '')

const managerUserHistory = async ({ chainId, prisma }: Props): Promise<any> => {
  // load all users count
  const userCount = await prisma.user.count()

  if (userCount === 0) {
    console.log(`No users found`)
    return
  }

  let currentUser = 0

  do {
    currentUser += 1

    // pick off users based on id and increment till end of list
    const user = await prisma.user.findUnique({
      where: {
        id: currentUser,
      },
    })

    const duneRes = await client.refresh(2974152, [QueryParameter.text('wallet_list', user?.address as string)])

    const rows = (duneRes.result?.rows || []) as Row[]

    const data = []

    for (const row of rows) {
      if (row.block_number) {
        for (let i = 0; i < row.block_number.length; i++) {
          data.push({
            wallet: row.wallet,
            direction: row.direction,
            block_number: row.block_number[i],
            block_time: new Date(row.block_time[i]).toISOString(),
            tx_hash: row.tx_hash[i],
            neighbor_address: row.neighbor_address[i],
            symbol: row.symbol[i] || '',
            token_amount: row.token_amount[i] || 0,
            chain: row.chain[i],
          })
        }
      }
    }

    await prisma.userHistory.createMany({
      data,
    })

    console.log(`Completed user history ${currentUser} / ${userCount}`)
  } while (currentUser < userCount)
}

export default managerUserHistory
