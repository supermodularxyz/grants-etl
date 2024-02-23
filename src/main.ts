import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import {
  manageApplications,
  managePassports,
  manageRounds,
  manageTx,
  manageVotes,
  managePoaps,
  manageArkham,
  manageRoundDistribution,
  manageDuneAddressTracked,
} from './loaders'
import { initialFetch } from './utils'
import { getAddress, isAddress } from 'viem'
import reformatAddress from './scripts'

const prisma = new PrismaClient()

export async function main({ chainId = '1', roundId }: { chainId: string; roundId?: string }) {
  roundId = isAddress(roundId as string) ? getAddress(roundId as string) : undefined

  await initialFetch(chainId)

  // manage the programs & rounds first
  console.log(`Starting programs and rounds indexing`)
  await manageRounds({ chainId, prisma, roundId })

  console.log(`Starting round Distribution results indexing`)
  await manageRoundDistribution({ chainId, prisma })

  // manage applications
  console.log(`Starting round applications indexing`)
  await manageApplications({ chainId, prisma, roundId })

  // manage votes
  console.log(`Starting projects' votes indexing`)
  await manageVotes({ chainId, prisma, roundId })

  // manage vote tx metadata
  console.log(`Starting loading tx metadata for votes`)
  await manageTx({ chainId, prisma })

  // disconnect from database at the end
  await prisma.$disconnect()
}

export const handleAddressReformat = async () => {
  // run the onetime fix
  await reformatAddress({ prisma })

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
