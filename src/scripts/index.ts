import { PrismaClient, User } from '@prisma/client'
import Bull from 'bull'

type Props = {
  prisma: PrismaClient
}

const reformatAddress = async ({ prisma }: Props) => {
  const users = (await prisma.$queryRaw`SELECT * FROM "User" WHERE address != LOWER(address) LIMIT 5000`) as User[]

  const usersQueue = new Bull('reformatAddress')
  await usersQueue.obliterate({ force: true })
  await usersQueue.pause()
  const concurrencyRate = 1000

  usersQueue.process(concurrencyRate, async (job: Bull.Job<{ id: number; address: string }>) => {
    const { data: user } = job

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        address: user.address.toLowerCase(),
      },
    })

    console.log(`Updated ${user.address}: ${await usersQueue.count()} left`)

    return Promise.resolve(true)
  })

  usersQueue.on('drained', async () => {
    const newUsers = (await prisma.$queryRaw`SELECT * FROM "User" WHERE address != LOWER(address) LIMIT 5000`) as User[]

    if (newUsers.length === 0) {
      console.log(`Updated user fields`)
      usersQueue.close()
    } else {
      await usersQueue.pause()
      for (const user of newUsers) {
        usersQueue.add(user)
      }
      await usersQueue.resume()
    }
  })

  usersQueue.on('failed', async (job) => {
    return await job.retry()
  })

  // Add voters to queue
  console.log(`Adding users to queue`)
  for (const user of users) {
    usersQueue.add(user)
  }
  await usersQueue.resume()
}

export default reformatAddress
