import { PrismaClient } from '@prisma/client'
import { fromHex } from 'viem'
import { Price, fetchRoundDistributionData, formatDistributionPrice, grantFetch } from '../utils'

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

  const priceList: Price[] = await grantFetch(`${chainId}/prices.json`)

  // get all rounds' projects
  const allDistributionResults = (
    await Promise.all(
      rounds.map(async (r) => ({
        round: r.id,
        ...((await fetchRoundDistributionData({
          chainId: Number(chainId),
          roundId: r.roundId as `0x${string}`,
          priceList,
        })) as { results: Distro[]; token: { price: number; decimal: number; code: string } }),
      }))
    )
  ).filter((i) => i.results !== null && i.results !== undefined)

  let rows: Rows[] = []

  for (let i = 0; i < allDistributionResults.length; i++) {
    const { round, results, token } = allDistributionResults[i]

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
      matchAmountUSD:
        token.price > 0
          ? formatDistributionPrice({
              amount: distro.matchAmountInToken.hex,
              price: token.price,
              decimal: token.decimal,
            })
          : undefined,
      originalMatchAmountUSD:
        token.price > 0
          ? formatDistributionPrice({
              amount: distro.originalMatchAmountInToken.hex,
              price: token.price,
              decimal: token.decimal,
            })
          : undefined,
      index: distro.index,
      chainId: Number(chainId),
      roundKey: round,
    }))

    rows = [...rows, ...distros]
  }

  for (const row of rows) {
    await prisma.matchingDistribution.upsert({
      where: {
        uid: {
          projectName: row.projectName,
          projectId: row.projectId,
          applicationId: row.applicationId,
          matchPoolPercentage: row.matchPoolPercentage,
          contributionsCount: row.contributionsCount,
        },
      },
      update: row,
      create: row,
    })
  }
}

export default manageRoundDistribution
