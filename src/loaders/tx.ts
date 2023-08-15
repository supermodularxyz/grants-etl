import { PrismaClient } from '@prisma/client'
import { Block, Transaction } from 'viem'
import { clients } from '../utils/client'

type Props = {
  chainId: string
  prisma: PrismaClient
}

const manageTx = async ({ chainId, prisma }: Props): Promise<any> => {
  const take = 150
  let totalVotes = 0

  const client = clients[Number(chainId) as keyof typeof clients]

  if (!client) {
    console.log(`Couldn't find client for this chain`)

    return
  }

  do {
    // load votes for chainId
    const votes = await prisma.vote.findMany({
      take,
      distinct: ['transaction'],
      where: {
        chainId: Number(chainId),
        tx_timestamp: 0,
      },
      select: {
        id: true,
        transaction: true,
        blockNumber: true,
        chainId: true,
        roundId: true,
        round: {
          select: {
            roundId: true,
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
    })

    console.log(`Found ${votes.length} votes`)

    if (votes.length === 0) {
      console.log(`End of votes`)

      break
    }

    totalVotes = votes.length

    console.log(`Working on tx metadata`)

    await Promise.all(
      votes.map(async (v) => {
        // load tx & block
        const tx = (await client.getTransaction({
          hash: v.transaction as `0x${string}`,
        })) as Transaction
        const block = (await client.getBlock({ blockNumber: BigInt(v.blockNumber) })) as Block

        // write update to db
        await prisma.vote.updateMany({
          where: {
            transaction: v.transaction,
            roundId: v.roundId,
            chainId: v.chainId,
          },
          data: {
            tx_gasPrice: tx?.gasPrice,
            tx_gasSpent: tx?.gas,
            tx_timestamp: block?.timestamp,
          },
        })
      })
    )

    // mock 1 second heartbeat for RPC
    await new Promise((res, rej) => {
      console.log(`5 seconds mock heartbeat for RPC`)
      setTimeout(() => res(true), 5000)
    })

    console.log(`Finished tx metadata${totalVotes === take ? ', moving to next batch' : ''}`)
  } while (totalVotes === take)
}

export default manageTx
