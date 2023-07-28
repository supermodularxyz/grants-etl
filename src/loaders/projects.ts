import { PrismaClient } from '@prisma/client'
import { PrismaClientOptions, DefaultArgs } from '@prisma/client/runtime/library'
import { getAddress } from 'viem'
import { grantFetch } from '../utils'

type Prisma = PrismaClient<PrismaClientOptions, never, DefaultArgs>

type Props = {
  chainId: string
  prisma: Prisma
}

const _handleRoundProject = async () => {}

const manageProjects = async ({ chainId, prisma }: Props) => {
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
  const allRounds = await Promise.all(
    rounds.map(async (r) => {
      const projectsList = (await grantFetch(`${chainId}/rounds/${r.roundId}/projects.json`)) as any[]

      return projectsList
      // return { round: r, projects: projectsList }
    })
  )

  // const applicationsData = (await grantFetch(`${chainId}/rounds.json`)) as any[]
}

export default manageProjects
