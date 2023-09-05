import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import minimist from 'minimist'
import { manageApplications, managePassports, manageRounds, manageTx, manageVotes, managerUserHistory } from './loaders'
import { initialFetch } from './utils'

const argv = minimist(process.argv.slice(2))

const prisma = new PrismaClient()

async function main() {
  // ... you will write your Prisma Client queries here
  const chainId = argv.chainId ?? '1' // default to mainnet

  await initialFetch(chainId)

  console.log(`Starting programs and rounds indexing`)

  // manage the programs & rounds first
  await manageRounds({ chainId, prisma })

  console.log(`Starting round applications indexing`)

  // manage applications
  await manageApplications({ chainId, prisma })

  console.log(`Starting projects' votes indexing`)

  // manage votes
  await manageVotes({ chainId, prisma })

  console.log(`Starting loading tx metadata for votes`)

  // manage vote tx metadata
  await manageTx({ chainId, prisma })

  console.log(`Starting passport indexing`)

  await managePassports({ chainId, prisma })

  console.log(`Starting user tx logs from dune`)

  await managerUserHistory({ chainId, prisma })
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
