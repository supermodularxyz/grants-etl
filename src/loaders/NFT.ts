import { toHex } from 'viem'
import { PrismaClient, NftTransferHistory } from '@prisma/client'
import Queue from 'bull'
import { supportedTxChains } from '../utils/tx'
import { TOKENTYPE, moralisLoader } from '../utils/moralis'
import { Decimal } from '@prisma/client/runtime/library'

type Props = {
  chainId: string
  prisma: PrismaClient
}

const manageNFT = async ({ prisma, chainId }: Props): Promise<any> => {
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

  console.log(`Indexing ${passportsCount} passport users NFT`)
  console.time('nftTransfers')

  if (passportsCount === 0) {
    console.log(`No voters found`)
    return Promise.resolve(true)
  }

  // create Queue
  const nftQueue = new Queue('nftTransfers')

  await nftQueue.obliterate({ force: true })

  const concurrencyRate = 100

  nftQueue.process(concurrencyRate, async (job: Queue.Job<{ id: number; userAddress: string }>) => {
    try {
      const { data: passport } = job

      const { userAddress: address } = passport

      console.log(`Processing ${address}`)

      let data: Omit<NftTransferHistory, 'id'>[] = []

      const latestTx = await prisma.nftTransferHistory.findFirst({
        where: {
          ownerAddress: address,
        },
        select: {
          block_number: true,
        },
        orderBy: {
          block_number: 'desc',
        },
      })

      const nftTransfers = await moralisLoader({
        chain: toHex(chainId),
        address,
        fromBlock: latestTx?.block_number || 0,
        tokenType: TOKENTYPE.NFT,
      })
      // TODO : Handle NFT Balances here

      if (nftTransfers.length === 0) {
        console.log(`No NFT transfer data found for ${address}`)
        return Promise.resolve(true)
      }

      if (nftTransfers) {
        for (let i = 0; i < nftTransfers.length; i++) {
          const item = nftTransfers[i]

          data.push({
            ...item,
            block_number: Number(item.block_number),
            transaction_index: Number(item.transaction_index),
            log_index: Number(item.log_index),
            value: new Decimal(item.value),
            amount: Number(item.amount),
            verified: Number(item.verified),
            ownerAddress: address,
            chainId,
          })
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
          await prisma.nftTransferHistory.createMany({
            data: chunk,
            skipDuplicates: true,
          })
        }
      }
      console.log(`=> Committed NFT data for ${address}`)
      console.timeLog('nftTransfers')

      return Promise.resolve(true)
    } catch (error) {
      console.log(error)
      throw error
    }
  })

  nftQueue.on('drained', () => {
    console.log(`Queue is empty`)
    nftQueue.close()
  })

  nftQueue.on('failed', async (job) => {
    return await job.retry()
  })

  // Add voters to queue
  console.log(`Adding passports to queue`)
  for (const passport of passports) {
    nftQueue.add(passport)
  }
}

export default manageNFT
