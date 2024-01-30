import { getAddress, isAddress, toHex } from 'viem'
import { PrismaClient, Erc20TransferHistory } from '@prisma/client'
import Queue from 'bull'
import { Decimal } from '@prisma/client/runtime/library'
import { supportedTxChains } from '../utils/tx'
import { TOKENTYPE, moralisLoader } from '../utils/moralis'
import { AxiosError } from 'axios'

type Props = {
  chainId: string
  prisma: PrismaClient
}

const manageERC20 = async ({ prisma, chainId }: Props): Promise<any> => {
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
  console.time('erc20Transfers')

  if (passportsCount === 0) {
    console.log(`No voters found`)
    return Promise.resolve(true)
  }

  // create Queue
  const erc20Queue = new Queue('erc20')

  await erc20Queue.obliterate({ force: true })

  const concurrencyRate = 20

  erc20Queue.process(concurrencyRate, async (job: Queue.Job<{ id: number; userAddress: string }>) => {
    try {
      const { data: passport } = job

      const { userAddress: address } = passport

      console.log(`Processing ${address}`)

      let data: Omit<Erc20TransferHistory, 'id'>[] = []

      // TODO : Get last block indexed and use it to load more

      const latestTx = await prisma.erc20TransferHistory.findFirst({
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

      const erc20Transfers = await moralisLoader({
        chain: toHex(chainId),
        fromBlock: latestTx?.block_number || 0,
        address,
        tokenType: TOKENTYPE.ERC20,
      })
      // TODO : Handle ERC20 Balances here

      if (erc20Transfers.length === 0) {
        console.log(`No erc20 transfer data found for ${address}`)
        return Promise.resolve(true)
      }

      if (erc20Transfers) {
        for (let i = 0; i < erc20Transfers.length; i++) {
          const item = erc20Transfers[i]

          data.push({
            ...item,
            chainId,
            token_logo: undefined,
            token_name: item.token_name ?? '',
            token_symbol: item.token_symbol ?? '',
            token_decimals: Number(item.token_decimals ?? '0'),
            block_number: Number(item.block_number ?? '0'),
            transaction_index: Number(item.transaction_index ?? '0'),
            log_index: Number(item.log_index),
            value: new Decimal(item.value ?? '0'),
            value_decimal: new Decimal(item.value_decimal ?? '0'),
            ownerAddress: address,
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
          await prisma.erc20TransferHistory.createMany({
            data: chunk,
            skipDuplicates: true,
          })
        }
      }
      console.log(`=> Committed erc20 data for ${address}`)
      console.timeLog('erc20Transfers')

      return Promise.resolve(true)
    } catch (error: any) {
      console.log(error)
      process.exit(0)
      throw error
    }
  })

  let completed = false

  erc20Queue.on('drained', () => {
    console.log(`Queue is empty`)
    completed = true
    erc20Queue.close()
  })

  erc20Queue.on('failed', async (job) => {
    return await job.retry()
  })

  // Add voters to queue
  console.log(`Adding passports to queue`)
  for (const passport of passports) {
    erc20Queue.add(passport)
  }

  await new Promise(async (res, rej) => {
    do {
      await new Promise((_res, _rej) => setTimeout(() => _res(true), 60000))
    } while (!completed)
    return res(true)
  })
}

export default manageERC20
