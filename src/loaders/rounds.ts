import { PrismaClient } from '@prisma/client'
import { getAddress } from 'viem'
import { fetchBlockTimestamp, grantFetch, handleDateString } from '../utils'

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

  const rounds = []
  const programs: Set<`0x${string}`> = new Set([])

  for (let i = 0; i < roundsData.length; i++) {
    const r = roundsData[i]

    const programContractAddress = getAddress(r.metadata?.programContractAddress)

    const [createdAt, updatedAt] = await fetchBlockTimestamp({
      chainId: Number(chainId),
      blockNumbers: [r.createdAtBlock, r.updatedAtBlock],
    })

    rounds.push({
      ...r,
      id: undefined,
      applicationsStartTime: handleDateString(r.applicationsStartTime),
      applicationsEndTime: handleDateString(r.applicationsEndTime),
      roundStartTime: handleDateString(r.roundStartTime),
      roundEndTime: handleDateString(r.roundEndTime),
      chainId: Number(chainId),
      roundId: r.id,
      programContractAddress,
      createdAt,
      updatedAt,
    })

    if (programContractAddress) {
      programs.add(programContractAddress)
    }
  }

  roundsData.reduce((acc, r) => {
    return acc
  })

  const programsList = Array.from(programs).map((p) => ({ programAddress: p })) as { programAddress: string }[]

  const roundsTotal = rounds.length
  const programsTotal = programsList.length

  console.log(
    `${rounds.length} round${roundsTotal !== 1 ? 's' : ''} found across ${programsTotal} program${
      programsTotal !== 1 ? 's' : ''
    }`
  )

  await prisma.program.createMany({
    data: programsList,
    skipDuplicates: true,
  })

  // TODO : Optimize this to skip rounds that are already ended & addedLastVotes = true
  for (const round of rounds) {
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

  // await prisma.round.createMany({
  //   data: data.rounds,
  //   skipDuplicates: true,
  // })
}

export default manageRounds
