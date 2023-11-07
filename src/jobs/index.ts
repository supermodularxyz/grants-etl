// import { ToadScheduler, SimpleIntervalJob, AsyncTask } from 'toad-scheduler'
import schedule from 'node-schedule'
import { main } from '../main'

const rule = new schedule.RecurrenceRule()
rule.hour = 14
rule.minute = 14

const job = schedule.scheduleJob(rule, async function () {
  await main({ chainId: '250' })
})

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
