import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { manageApplications, managePassports, manageRounds, manageTx, manageVotes } from './loaders'
import { initialFetch } from './utils'
import { getAddress, isAddress } from 'viem'

const prisma = new PrismaClient()

export async function main({ chainId = '1', roundId }: { chainId: string; roundId?: string }) {
  roundId = isAddress(roundId as string) ? getAddress(roundId as string) : undefined

  await initialFetch(chainId)

  console.log(`Starting programs and rounds indexing`)

  // manage the programs & rounds first
  await manageRounds({ chainId, prisma, roundId })

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

export const indexPassports = async () => {
  console.log(`Starting Passports indexing`)

  await managePassports({ prisma })

  // disconnect from database at the end
  await prisma.$disconnect()
}

export const disconnect = async () => {
  await prisma.$disconnect()
}
