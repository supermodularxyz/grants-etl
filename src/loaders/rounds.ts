import { PrismaClient } from '@prisma/client'
import { getAddress } from 'viem'
import { grantFetch } from '../utils'

type Props = {
  chainId: string
  prisma: PrismaClient
}

const manageRounds = async ({ chainId, prisma }: Props) => {
  const roundsData = (await grantFetch(`${chainId}/rounds.json`)) as any[]

  const data = roundsData.reduce(
    (acc, r) => {
      const programContractAddress = getAddress(r.metadata?.programContractAddress)

      acc.rounds.push({
        ...r,
        id: undefined,
        applicationsStartTime: String(r.applicationsStartTime),
        applicationsEndTime: String(r.applicationsEndTime),
        roundStartTime: String(r.roundStartTime),
        roundEndTime: String(r.roundEndTime),
        chainId: chainId,
        roundId: r.id,
        programContractAddress,
      })

      if (programContractAddress) {
        acc.programs.add(programContractAddress)
      }

      return acc
    },
    { rounds: [], programs: new Set([]) }
  )

  const programsList = Array.from(data.programs).map((p) => ({ programAddress: p })) as { programAddress: string }[]

  const roundsTotal = data.rounds.length
  const programsTotal = programsList.length

  console.log(
    `${data.rounds.length} round${roundsTotal !== 1 ? 's' : ''} found across ${programsTotal} program${
      programsTotal !== 1 ? 's' : ''
    }`
  )

  await prisma.program.createMany({
    data: programsList,
    skipDuplicates: true,
  })

  await prisma.round.createMany({
    data: data.rounds,
    skipDuplicates: true,
  })
}

export default manageRounds
