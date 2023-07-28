import { PrismaClient } from '@prisma/client'
import { PrismaClientOptions, DefaultArgs } from '@prisma/client/runtime/library'
import { getAddress } from 'viem'
import { grantFetch } from '../utils'

type Prisma = PrismaClient<PrismaClientOptions, never, DefaultArgs>

type Props = {
  chainId: string
  prisma: Prisma
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

  for (const round of rounds) {
    const votesList = (await grantFetch(`${chainId}/rounds/${round.roundId}/votes.json`)) as any[]

    for (const vote of votesList) {
      const address = getAddress(vote.voter)

      const user = await prisma.user.upsert({
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

      await prisma.vote.upsert({
        where: {
          uid: {
            transaction: vote.transaction,
            roundId: round.id,
          },
        },
        update: {},
        create: {
          ...vote,
          id: undefined,
          projectId: project?.id,
          roundId: round.id,
        },
      })

      console.log(`Committed vote ${vote.transaction}`)
    }
  }
}

export default manageVotes
