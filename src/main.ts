import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import {
  manageApplications,
  managePassports,
  manageRounds,
  manageTx,
  manageVotes,
  managerUserInternalTxHistory,
  managerUserTxHistory,
  managePoaps,
  manageArkham,
  manageRoundDistribution,
  manageStakers,
  manageERC20,
  manageNFT,
  manageDuneAddressTracked,
} from './loaders'
import { initialFetch } from './utils'
import { getAddress, isAddress } from 'viem'
import Moralis from 'moralis'

const prisma = new PrismaClient()

export async function main({ chainId = '1', roundId }: { chainId: string; roundId?: string }) {
  roundId = isAddress(roundId as string) ? getAddress(roundId as string) : undefined

  await initialFetch(chainId)

  await Moralis.start({
    apiKey: process.env.MORALIS as string,
  })

  console.log(`Starting programs and rounds indexing`)

  // manage the programs & rounds first
  await manageRounds({ chainId, prisma, roundId })

  console.log(`Starting round Distribution results indexing`)

  await manageRoundDistribution({ chainId, prisma })

  console.log(`Starting round applications indexing`)

  // manage applications
  await manageApplications({ chainId, prisma, roundId })

  console.log(`Starting projects' votes indexing`)

  // manage votes
  await manageVotes({ chainId, prisma, roundId })

  console.log(`Starting loading tx metadata for votes`)

  // manage vote tx metadata
  await manageTx({ chainId, prisma })

  // disconnect from database at the end
  await prisma.$disconnect()
}

export const indexPassports = async (rounds?: { chainId: number; roundId: string }[]) => {
  console.log(`Starting Passports indexing`)

  await managePassports({ prisma, rounds: rounds || [] })

  if (!rounds || rounds.length === 0) {
    await manageDuneAddressTracked({ prisma })
  }

  // disconnect from database at the end
  await prisma.$disconnect()
}

export const indexPoaps = async () => {
  console.log(`Starting Poap indexing`)

  await managePoaps({ prisma, chainId: 424 })

  // disconnect from database at the end
  await prisma.$disconnect()
}

export const indexArkham = async () => {
  console.log(`Starting Arkham indexing`)

  await manageArkham({ prisma })

  // disconnect from database at the end
  await prisma.$disconnect()
}

export const disconnect = async () => {
  await prisma.$disconnect()
}

export const indexStakers = async () => {
  console.log(`Starting Stakers indexing`)

  await manageStakers({ prisma })

  // disconnect from database at the end
  await prisma.$disconnect()
}

export const managePassportArchive = async () => {
  const rounds = await prisma.round.findMany({
    where: {
      roundEndTime: {
        lte: new Date().valueOf(),
      },
      addedLastPassports: false,
    },
    select: {
      chainId: true,
      roundId: true,
    },
  })

  await indexPassports(rounds)
}
