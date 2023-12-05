import { PrismaClient } from '@prisma/client'
import { Block, Transaction } from 'viem'
import { clients } from '../utils/client'

type Props = {
  chainId: string
  prisma: PrismaClient
  roundId?: string
}

const manageTx = async ({ chainId, prisma, roundId }: Props): Promise<any> => {
  const take = 500
  let totalVotes = 0

  const client = clients[Number(chainId) as keyof typeof clients]

  if (!client) {
    console.log(`Couldn't find client for this chain`)

    return
  }

  let votesFilter: { chainId: number; tx_timestamp: number; round: { roundId?: string } } = {
    chainId: Number(chainId),
    tx_timestamp: 0,
    round: {
      roundId,
    },
  }

  // let votesFilter: { chainId: number; tx_timestamp: number; round: { roundId?: string; addedLastVotes: boolean } } = {
  //   chainId: Number(chainId),
  //   tx_timestamp: 0,
  //   round: {
  //     roundId,
  //     addedLastVotes: false,
  //   },
  // }

  const availableRounds: Set<number> = new Set([])

  do {
    // load votes for chainId
    const votes = await prisma.vote.findMany({
      take,
      distinct: ['transaction'],
      where: votesFilter,
      select: {
        id: true,
        transaction: true,
        blockNumber: true,
        chainId: true,
        roundId: true,
        round: {
          select: {
            roundId: true,
            roundEndTime: true,
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
        // add vote round end time for later toggling
        if (Math.trunc(Date.now() / 1000) > v.round.roundEndTime) {
          availableRounds.add(v.roundId)
        }

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

  // TODO : Disable rounds votes & tx indexing if it has ended
  if (availableRounds.size > 0) {
    await prisma.round.updateMany({
      where: {
        id: {
          in: Array.from(availableRounds),
        },
      },
      data: {
        addedLastVotes: true,
      },
    })

    console.log(`\r\n   Some rounds have ended, disabling further votes & tx indexing\r\n`)
  }
}

export default manageTx
