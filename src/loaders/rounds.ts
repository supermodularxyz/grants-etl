import { PrismaClient } from '@prisma/client'
import { getAddress, isAddress } from 'viem'
import { fetchBlockTimestamp, handleDateString } from '../utils'
import { getRounds } from '../graphql'
import { ethers } from 'ethers'

type Props = {
  chainId: string
  prisma: PrismaClient
  roundId?: string
}

const manageRounds = async ({ chainId, prisma, roundId }: Props) => {
  const roundResult = (await getRounds(Number(chainId))) as { rounds: any[] }
  let roundsData = roundResult.rounds

  // if specific round is set, filter it from roundsData and continue
  if (roundId) {
    roundsData = roundsData.filter((r) => getAddress(r.id) === roundId)

    if (roundsData.length === 0) {
      console.error('This round does not exist. Please make sure to specify the right chainId for the round')
      process.exit(1)
    }
  }

  const rounds = []
  const programs: Set<string> = new Set([])

  for (let i = 0; i < roundsData.length; i++) {
    const r = roundsData[i]

    if (isAddress(r.id)) {
      // default program to address zero
      const programContractAddress = isAddress(r.roundMetadata?.programContractAddress)
        ? getAddress(r.roundMetadata?.programContractAddress)
        : ethers.constants.AddressZero

      const [createdAt, updatedAt] = await fetchBlockTimestamp({
        chainId: Number(chainId),
        blockNumbers: [r.createdAtBlock, r.updatedAtBlock],
      })

      rounds.push({
        amountUSD: r.totalAmountDonatedInUsd,
        votes: r.totalDonationsCount,
        token: r.matchTokenAddress,
        matchAmount: r.matchAmount,
        matchAmountUSD: r.matchAmountInUsd,
        uniqueContributors: r.uniqueDonorsCount,
        applicationMetaPtr: r.applicationMetadataCid,
        applicationMetadata: r.applicationMetadata,
        metaPtr: r.roundMetadataCid,
        metadata: r.roundMetadata,
        applicationsStartTime: handleDateString(r.applicationsStartTime),
        applicationsEndTime: handleDateString(r.applicationsEndTime),
        roundStartTime: handleDateString(r.donationsStartTime),
        roundEndTime: handleDateString(r.donationsEndTime),
        createdAt,
        updatedAt,
        createdAtBlock: Number(r.createdAtBlock),
        updatedAtBlock: Number(r.updatedAtBlock),
        chainId: Number(chainId),
        roundId: r.id,
        programContractAddress,
      })

      if (programContractAddress) {
        programs.add(programContractAddress)
      }
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
    const uid = {
      chainId: Number(chainId),
      roundId: getAddress(round.roundId),
    }

    // delete duplicate rounds, applications and votes
    const dupRound = await prisma.round.findUnique({
      where: {
        uid,
      },
      select: {
        id: true,
      },
    })

    if (dupRound && chainId !== '424') {
      console.log(`Found duplicate round: ${uid.roundId}`)

      await prisma.vote.deleteMany({
        where: {
          roundId: dupRound.id,
        },
      })

      await prisma.applicationsInRounds.deleteMany({
        where: {
          roundId: dupRound.id,
        },
      })

      await prisma.matchingDistribution.deleteMany({
        where: {
          roundKey: dupRound.id,
        },
      })

      await prisma.round.delete({
        where: {
          uid,
        },
      })

      console.log(`Deleted duplicate round: ${uid.roundId}`)
    }

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
