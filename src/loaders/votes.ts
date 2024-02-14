import { PrismaClient } from '@prisma/client'
import { getAddress } from 'viem'
import { GraphQLResponse, getVotes } from '../graphql'

type Props = {
  chainId: string
  prisma: PrismaClient
  roundId?: string
}

const manageVotes = async ({ chainId, prisma, roundId }: Props) => {
  let roundFilter: { chainId: number; roundId?: string } = {
    chainId: Number(chainId),
  }

  // let roundFilter: { chainId: number; roundId?: string; addedLastVotes: boolean } = {
  //   chainId: Number(chainId),
  //   addedLastVotes: false,
  // }

  if (roundId) {
    roundFilter = { ...roundFilter, roundId }
  }

  // load rounds for chainId
  const rounds = await prisma.round.findMany({
    where: roundFilter,
    select: {
      id: true,
      roundId: true,
      roundEndTime: true,
    },
  })

  for (const [rIndex, round] of rounds.entries()) {
    const votesResponse = (await getVotes({
      chainId: Number(chainId),
      roundId: round.roundId.toLowerCase(),
    })) as GraphQLResponse<{ donations: any[] }>

    const votesList = votesResponse?.round?.donations || []

    // logger(`Committing vote: ${vote.transaction}`)
    if (votesList.length > 0) {
      process.stdout.write(`\n`)
    }
    process.stdout.write(
      `${votesList.length} votes found for round (${rIndex + 1}/${rounds.length}): ${round.roundId} \n`
    )

    for (const [index, vote] of votesList.entries()) {
      const address = getAddress(vote.donorAddress)
      const currentCount = index + 1
      const isLast = index + 1 === votesList.length

      await prisma.user.upsert({
        where: {
          address,
        },
        update: {},
        create: {
          address,
        },
      })

      const project = await prisma.project.findUnique({
        where: {
          projectKey: vote.projectId,
        },
      })

      if (project) {
        await prisma.vote.upsert({
          where: {
            uid: {
              transaction: vote.transactionHash,
              roundId: round.id,
              projectId: project.id,
            },
          },
          update: {},
          create: {
            voteId: vote.id,
            projectId: project.id,
            roundId: round.id,
            chainId: Number(chainId),
            transaction: vote.transactionHash,
            blockNumber: Number(vote.blockNumber),
            applicationId: vote.applicationId,
            voter: vote.donorAddress,
            grantAddress: vote.recipientAddress,
            token: vote.tokenAddress,
            amount: vote.amount,
            amountUSD: vote.amountInUsd,
            amountRoundToken: vote.amountInRoundMatchToken,
          },
        })

        process.stdout.write(
          ` => Committed ${currentCount} of ${votesList.length} votes (${
            Math.round((currentCount / votesList.length) * 10000) / 100
          }%) ${isLast ? '\n' : '\r'}`
        )
      }
    }

    // if (Math.trunc(Date.now() / 1000) > round.roundEndTime) {
    //   await prisma.round.update({
    //     where: {
    //       id: round.id,
    //     },
    //     data: {
    //       addedLastVotes: true,
    //     },
    //   })

    //   console.log(`\r\n   Round has ended, disabling further votes indexing\r\n`)
    // }
  }
}

export default manageVotes
