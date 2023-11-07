import 'dotenv/config'
import minimist from 'minimist'
import { main } from './main'

const argv = minimist(process.argv.slice(2), { string: ['roundId'] })

// async function startIndexing() {
//   // ... you will write your Prisma Client queries here
//   const chainId = argv.chainId ?? '1' // default to mainnet
//   const roundId = isAddress(argv.roundId) ? getAddress(argv.roundId) : undefined

//   await initialFetch(chainId)

//   console.log(`Starting programs and rounds indexing`)

//   // manage the programs & rounds first
//   await manageRounds({ chainId, prisma, roundId })

//   console.log(`Starting round applications indexing`)

//   // manage applications
//   await manageApplications({ chainId, prisma, roundId })

//   console.log(`Starting projects' votes indexing`)

//   // manage votes
//   await manageVotes({ chainId, prisma, roundId })

//   console.log(`Starting loading tx metadata for votes`)

//   // manage vote tx metadata
//   await manageTx({ chainId, prisma })

//   // console.log(`Starting passport indexing`)

//   // await managePassports({ chainId, prisma })
// }

main({ chainId: argv.chainId, roundId: argv.roundId }).catch(async (e) => {
  console.error(e)
  process.exit(1)
})
