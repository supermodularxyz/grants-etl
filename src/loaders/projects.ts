import { PrismaClient } from '@prisma/client'
import { grantFetch } from '../utils'

type Props = {
  chainId: string
  prisma: PrismaClient
}

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
