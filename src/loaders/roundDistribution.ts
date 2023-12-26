import { PrismaClient } from '@prisma/client'
import { fromHex } from 'viem'
import { fetchRoundDistributionData, grantFetch } from '../utils'

type Props = {
  chainId: string
  prisma: PrismaClient
}

type Distro = {
  contributionsCount: string
  projectPayoutAddress: string
  applicationId: string
  projectId: string
  matchPoolPercentage: number
  projectName: string
  matchAmountInToken: {
    type: string
    hex: `0x${string}`
  }
  originalMatchAmountInToken: {
    type: string
    hex: `0x${string}`
  }
  index: number
}

type Rows = {
  contributionsCount: number
  projectPayoutAddress: string
  applicationId: number
  projectId: string
  matchPoolPercentage: number
  projectName: string
  matchAmountInTokenHex: string
  matchAmountInToken: string
  originalMatchAmountInTokenHex: string
  originalMatchAmountInToken: string
  index: number
  chainId: number
  roundKey: number
}

const manageRoundDistribution = async ({ chainId, prisma }: Props) => {
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

  // get all rounds' projects
  const allDistributionResults = (
    await Promise.all(
      rounds.map(async (r) => ({
        round: r.id,
        results: (await fetchRoundDistributionData({
          chainId: Number(chainId),
          roundId: r.roundId as `0x${string}`,
        })) as Distro[],
      }))
    )
  ).filter((i) => i.results !== null)

  let rows: Rows[] = []

  for (let i = 0; i < allDistributionResults.length; i++) {
    const { round, results } = allDistributionResults[i]

    const distros = results.map((distro) => ({
      contributionsCount: Number(distro.contributionsCount || 0),
      projectPayoutAddress: distro.projectPayoutAddress,
      applicationId: Number(distro.applicationId),
      projectId: distro.projectId,
      matchPoolPercentage: distro.matchPoolPercentage,
      projectName: distro.projectName,
      matchAmountInTokenHex: distro.matchAmountInToken.hex,
      matchAmountInToken: fromHex(distro.matchAmountInToken.hex, 'bigint').toString(),
      originalMatchAmountInTokenHex: distro.originalMatchAmountInToken.hex,
      originalMatchAmountInToken: fromHex(distro.originalMatchAmountInToken.hex, 'bigint').toString(),
      index: distro.index,
      chainId: Number(chainId),
      roundKey: round,
    }))

    rows = [...rows, ...distros]
  }

  const chunkSize = 300
  const chunks = []

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    chunks.push(chunk)
  }

  for (const chunk of chunks) {
    await prisma.matchingDistribution.createMany({
      data: chunk,
      skipDuplicates: true,
    })
  }
}

export default manageRoundDistribution
