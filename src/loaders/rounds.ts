import { PrismaClient } from '@prisma/client'
import { getAddress } from 'viem'
import { grantFetch, handleDateString } from '../utils'

type Props = {
  chainId: string
  prisma: PrismaClient
  roundId?: string
}

const manageRounds = async ({ chainId, prisma, roundId }: Props) => {
  let roundsData = (await grantFetch(`${chainId}/rounds.json`)) as any[]

  // if specific round is set, filter it from roundsData and continue
  if (roundId) {
    roundsData = roundsData.filter((r) => getAddress(r.id) === roundId)

    if (roundsData.length === 0) {
      console.error('This round does not exist. Please make sure to specify the right chainId for the round')
      process.exit(1)
    }
  }

  const data = roundsData.reduce(
    (acc, r) => {
      const programContractAddress = getAddress(r.metadata?.programContractAddress)

      acc.rounds.push({
        ...r,
        id: undefined,
        applicationsStartTime: handleDateString(r.applicationsStartTime),
        applicationsEndTime: handleDateString(r.applicationsEndTime),
        roundStartTime: handleDateString(r.roundStartTime),
        roundEndTime: handleDateString(r.roundEndTime),
        chainId: Number(chainId),
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

  for (const round of data.rounds) {
    await prisma.round.upsert({
      where: {
        uid: {
          chainId: Number(chainId),
          roundId: round.roundId,
        },
      },
      update: round,
      create: round,
    })
  }

  process.exit(0)

  // await prisma.round.createMany({
  //   data: data.rounds,
  //   skipDuplicates: true,
  // })
}

export default manageRounds
