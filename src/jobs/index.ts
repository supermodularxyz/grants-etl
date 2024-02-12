// import { ToadScheduler, SimpleIntervalJob, AsyncTask } from 'toad-scheduler'
import schedule from 'node-schedule'
import minimist from 'minimist'
import { main, disconnect, indexPassports, indexPoaps, indexArkham } from '../main'

const argv = minimist(process.argv.slice(2), { boolean: ['passport', 'poap', 'arkham'] })

const rule = new schedule.RecurrenceRule()
rule.hour = 8
rule.minute = 15

const { chainId, passport, poap, arkham } = argv

if (chainId) {
  console.log(`Scheduling job for chainId = ${chainId}`)

  const job = schedule.scheduleJob(rule, async function () {
    try {
      await main({ chainId })
    } catch (error) {
      console.log(error)
    }

    await disconnect()

    console.log(`Completed indexing for chainId = ${argv.chainId}`)
  })

  console.log(`Scheduled job (${job.name}) for chainId = ${chainId}`)
}

if (passport) {
  console.log(`Scheduling job for Live Passports data`)

  const job = schedule.scheduleJob(rule, async function () {
    try {
      await indexPassports()
    } catch (error) {
      console.log(error)
    }

    await disconnect()

    console.log(`Completed indexing for Passports`)
  })

  console.log(`Scheduled job (${job.name}) for Passports`)
}

if (poap) {
  const startIndexing = async () => {
    console.log(`Starting one-time job for PGN Poap data`)
    try {
      await indexPoaps()
    } catch (error) {
      console.log(error)
    }

    await disconnect()
  }

  startIndexing()
}

if (arkham) {
  const startIndexing = async () => {
    console.log(`Starting one-time job for Arkham data`)
    try {
      await indexArkham()
    } catch (error) {
      console.log(error)
    }

    await disconnect()
  }

  startIndexing()
}
