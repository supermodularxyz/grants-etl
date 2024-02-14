import { PrismaClient } from '@prisma/client'
import { getApplicationTx } from '../utils'
import { GraphQLResponse, getApplications } from '../graphql'

type Props = {
  chainId: string
  prisma: PrismaClient
  roundId?: string
}

const manageApplications = async ({ chainId, prisma, roundId }: Props) => {
  let roundFilter: { chainId: number; roundId?: string } = {
    chainId: Number(chainId),
  }
  // let roundFilter: { chainId: number; addedLastApplications: boolean; roundId?: string } = {
  //   chainId: Number(chainId),
  //   addedLastApplications: false,
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
      addedLastApplications: true,
      applicationsEndTime: true,
    },
  })

  for (const [rIndex, round] of rounds.entries()) {
    const applicationResponse = (await getApplications({
      chainId: Number(chainId),
      roundId: round.roundId.toLowerCase(),
    })) as GraphQLResponse<{ applications: any[] }>
    const applicationList = applicationResponse.round.applications

    console.log(
      `${applicationList.length} application${
        applicationList.length !== 1 ? 's' : ''
      } found for active application round (${rIndex + 1}/${rounds.length}) : ${round.roundId}`
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
      await prisma.applicationsInRounds.upsert({
        where: {
          roundId_projectId_applicationId: {
            roundId: round.id,
            projectId: project.id,
            applicationId: Number(application.id),
          },
        },
        update: {
          status: application.status,
          amountUSD: application.totalAmountDonatedInUsd,
          votes: application.totalDonationsCount,
          applicationId: Number(application.id),
        },
        create: {
          roundId: round.id,
          projectId: project.id,
          status: application.status,
          amountUSD: application.totalAmountDonatedInUsd,
          applicationId: Number(application.id),
          votes: application.totalDonationsCount,
          uniqueContributors: application.uniqueDonorsCount ?? 0,
          project_name: application.metadata?.application?.project?.title ?? '',
          project_desc: application.metadata?.application?.project?.description ?? '',
          project_website: application.metadata?.application?.project?.website ?? '',
          project_github: projectGithub ? `https://github.com/${projectGithub}` : undefined,
          user_github: userGithub ? `https://github.com/${userGithub}}` : undefined,
          applicationMetadata: application.metadataCid,
          payoutAddress: application.metadata?.application?.recipient ?? '',
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

    // check if the round application ended and update database field for round
    if (!round.addedLastApplications && Math.trunc(Date.now() / 1000) > round.applicationsEndTime) {
      await prisma.round.update({
        where: {
          id: round.id,
        },
        data: {
          addedLastApplications: true,
        },
      })

      console.log(`\r\n   Round application period has ended, disabling further indexing\r\n`)
    }
  }
}

export default manageApplications
