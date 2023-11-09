// import { ToadScheduler, SimpleIntervalJob, AsyncTask } from 'toad-scheduler'
import schedule from 'node-schedule'
import minimist from 'minimist'
import { main, disconnect } from '../main'

const argv = minimist(process.argv.slice(2))

const rule = new schedule.RecurrenceRule()
rule.hour = 8
rule.minute = 15

const chainId = argv.chainId

if (!chainId || chainId.length === 0) {
  console.log(`You have to specify a chainId for the cron jobs`)

  process.exit(1)
}

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

// const scheduler = new ToadScheduler()

// const task = new AsyncTask(
//   'Trial Task',
//   () => {
//     return main({ chainId: '250' })
//   },
//   (err: Error) => {
//     /* handle error here */
//     console.log(err)
//   }
// )
// const job = new SimpleIntervalJob({ hours:  }, task)

// scheduler.addSimpleIntervalJob(job)
