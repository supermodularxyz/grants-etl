import { getAddress, isAddress } from 'viem'
import { PrismaClient, UserTx } from '@prisma/client'
import { UserTxManager, supportedTxChains } from '../utils/tx'
import Queue from 'bull'

type Props = {
  chainId: string
  prisma: PrismaClient
}

const managerUserTxHistory = async ({ prisma, chainId }: Props): Promise<any> => {
  if (!supportedTxChains[Number(chainId)]) {
    console.log(`No Tx manager found for ${chainId}`)
    return
  }

  // load all passports with scores > 0
  const passports = await prisma.passport.findMany({
    where: {
      score: {
        gt: 0,
      },
    },
    select: {
      id: true,
      userAddress: true,
    },
  })

  const passportsCount = passports.length

  console.log(`Indexing ${passportsCount} passports`)
  console.time('TxHistory')

  if (passportsCount === 0) {
    console.log(`No voters found`)
    return Promise.resolve(true)
  }

  // create Queue
  const userTxQueue = new Queue('userTxHistory')

  await userTxQueue.obliterate({ force: true })

  const txHandler = new UserTxManager(Number(chainId))

  const concurrencyRate = 100

  userTxQueue.process(concurrencyRate, async (job: Queue.Job<{ id: number; userAddress: string }>) => {
    // userTxQueue.process(async (job: Queue.Job<{ id: number; userAddress: string }>) => {
    const { data: passport } = job

    const { userAddress: address } = passport

    console.log(`Processing ${address}`)

    // get the last recorded block
    const userLatestTx = await prisma.userTx.findFirst({
      where: {
        OR: [{ from: address.toLowerCase() }, { from: address }],
        // OR: [{ from: address.toLowerCase() }, { from: address }, { to: address.toLowerCase() }, { to: address }],
      },
      orderBy: {
        block: 'desc',
      },
      select: {
        block: true,
      },
    })

    let data: Omit<UserTx, 'id'>[] = []

    const lastBlock = Number(userLatestTx?.block ?? '0')

    console.log(`${address} requesting all tx data fromBlock: ${lastBlock}`)
    const txData = await txHandler.loadMore(address, lastBlock)

    if (txData.length === 0) {
      console.log(`No new tx data found for ${address}`)
      return Promise.resolve(true)
    }

    if (txData) {
      for (let i = 0; i < txData.length; i++) {
        const item = txData[i]

        const [newAddress, mainAddress] = address === item.to ? [item.from, item.to] : [item.to, item.from]
        if (isAddress(newAddress)) {
          await prisma.user.upsert({
            where: {
              address: getAddress(newAddress),
            },
            create: {
              address: getAddress(newAddress),
            },
            update: {},
          })
        }

        data.push({ ...item, mainAddress })
      }
    }

    if (data.length > 0) {
      console.log(`Row grouping completed, ${data.length} groups found. Creating data chunks`)

      const chunkSize = 300
      const chunks = []

      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize)
        chunks.push(chunk)
      }

      console.log(`Data chunks done, writing chunks to database`)

      for (const chunk of chunks) {
        await prisma.userTx.createMany({
          data: chunk,
          skipDuplicates: true,
        })
      }
    }
    console.log(`Committed tx data for ${address}`)
    console.timeLog('TxHistory')

    return Promise.resolve(true)
  })

  userTxQueue.on('drained', () => {
    console.log(`Queue is empty`)
    userTxQueue.close()
  })

  userTxQueue.on('failed', async (job) => {
    return await job.retry()
  })

  // Add voters to queue
  console.log(`Adding passports to queue`)
  for (const passport of passports) {
    userTxQueue.add(passport)
  }
}

export default managerUserTxHistory
