import 'dotenv/config'
import minimist from 'minimist'
import { main, disconnect } from './main'

const argv = minimist(process.argv.slice(2), { string: ['roundId'] })

main({ chainId: argv.chainId, roundId: argv.roundId }).catch(async (e) => {
  console.error(e)
  await disconnect()
  process.exit(1)
})
