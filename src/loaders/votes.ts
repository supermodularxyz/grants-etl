import { PrismaClient } from '@prisma/client'
import { getAddress } from 'viem'
import { grantFetch } from '../utils'

type Props = {
  chainId: string
  prisma: PrismaClient
}

const manageVotes = async ({ chainId, prisma }: Props) => {
  // load rounds for chainId
  const rounds = await prisma.round.findMany({
    where: {
      chainId: Number(chainId),
    },
    select: {
      id: true,
      roundId: true,
    },
  })

  for (const [rIndex, round] of rounds.entries()) {
    const votesList = (await grantFetch(`${chainId}/rounds/${round.roundId}/votes.json`)) as any[]

    // logger(`Committing vote: ${vote.transaction}`)
    if (votesList.length > 0) {
      process.stdout.write(`\n`)
    }
    process.stdout.write(
      `${votesList.length} votes found for round (${rIndex + 1}/${rounds.length}): ${round.roundId} \n`
    )

    for (const [index, vote] of votesList.entries()) {
      const address = getAddress(vote.voter)
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
              transaction: vote.transaction,
              roundId: round.id,
              projectId: project.id,
            },
          },
          update: {},
          create: {
            ...vote,
            id: undefined,
            projectId: project.id,
            roundId: round.id,
            chainId: Number(chainId),
          },
        })

        process.stdout.write(
          ` => Committed ${currentCount} of ${votesList.length} votes (${
            Math.round((currentCount / votesList.length) * 10000) / 100
          }%) ${isLast ? '\n' : '\r'}`
        )
      }
    }
  }
}

export default manageVotes
