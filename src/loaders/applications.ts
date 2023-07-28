import { PrismaClient } from '@prisma/client'
import { PrismaClientOptions, DefaultArgs } from '@prisma/client/runtime/library'
import { getAddress } from 'viem'
import { grantFetch } from '../utils'

type Prisma = PrismaClient<PrismaClientOptions, never, DefaultArgs>

type Props = {
  chainId: string
  prisma: Prisma
}

const manageApplications = async ({ chainId, prisma }: Props) => {
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
    const applicationList = (await grantFetch(`${chainId}/rounds/${round.roundId}/applications.json`)) as any[]

    for (const application of applicationList) {
      // add project

      const project = await prisma.project.upsert({
        where: {
          projectKey: application.projectId,
        },
        update: {},
        create: {
          projectKey: application.projectId,
        },
      })

      // create projectsInRounds
      await prisma.projectsInRounds.upsert({
        where: {
          roundId_projectId: {
            roundId: round.id,
            projectId: project.id,
          },
        },
        update: {},
        create: {
          roundId: round.id,
          projectId: project.id,
          status: application.status,
          amountUSD: application.amountUSD,
          votes: application.votes,
          uniqueContributors: application.uniqueContributors,
          project_name: application.metadata?.application?.project?.title,
          project_desc: application.metadata?.application?.project?.description,
          project_website: application.metadata?.application?.project?.website,
          applicationMetadata: application.metadata,
        },
      })
    }
  }
}

export default manageApplications
