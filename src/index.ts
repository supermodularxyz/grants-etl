import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import minimist from 'minimist'
import { manageProjects, manageApplications, manageRounds, manageVotes } from './loaders'

const argv = minimist(process.argv.slice(2))

const prisma = new PrismaClient()

async function main() {
  // ... you will write your Prisma Client queries here
  const chainId = argv.chainId ?? '1' // default to mainnet

  // manage the programs & rounds first
  await manageRounds({ chainId, prisma })

  // manage applications
  await manageApplications({ chainId, prisma })

  // manage votes
  await manageVotes({ chainId, prisma })

  // manage contributions/votes
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
