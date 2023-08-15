import { PrismaClient } from '@prisma/client'
import { getApplicationTx, grantFetch } from '../utils'

type Props = {
  chainId: string
  prisma: PrismaClient
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

  for (const [rIndex, round] of rounds.entries()) {
    const applicationList = (await grantFetch(`${chainId}/rounds/${round.roundId}/applications.json`)) as any[]

    console.log(
      `${applicationList.length} application${applicationList.length !== 1 ? 's' : ''} found for round (${rIndex + 1}/${
        rounds.length
      }) : ${round.roundId}`
    )

    for (const [index, application] of applicationList.entries()) {
      const currentCount = index + 1
      const isLast = currentCount === applicationList.length

      const project = await prisma.project.upsert({
        where: {
          projectKey: application.projectId,
        },
        update: {},
        create: {
          projectKey: application.projectId,
        },
      })

      // Use { application.projectId, application.createdAtBlock } to get txHash for application
      const tx = await getApplicationTx({
        chainId,
        projectId: application.projectId,
        block: application.createdAtBlock,
        roundId: round.roundId as `0x${string}`,
      })

      const userGithub = application.metadata?.application?.project?.userGithub
      const projectGithub = application.metadata?.application?.project?.projectGithub

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
          project_github: projectGithub ? `https://github.com/${projectGithub}` : undefined,
          user_github: userGithub ? `https://github.com/${userGithub}}` : undefined,
          applicationMetadata: application.metadata,
          payoutAddress: application.metadata?.application?.recipient,
          transaction: (tx?.hash as string) || '',
          tx_gasPrice: tx?.gasPrice,
          tx_gasSpent: tx?.gas,
        },
      })

      process.stdout.write(
        ` => Committed ${index + 1} of ${applicationList.length} applications (${
          Math.round((currentCount / applicationList.length) * 10000) / 100
        }%) ${isLast ? '\n' : '\r'}`
      )
    }
  }
}

export default manageApplications
