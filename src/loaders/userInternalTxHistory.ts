import { getAddress, isAddress } from 'viem'
import { PrismaClient, UserInternalTx } from '@prisma/client'
import { AnkrProvider, Blockchain } from '@ankr.com/ankr.js'
import Queue from 'bull'
import { supportedTxChains } from '../utils/tx'

type Props = {
  chainId: string
  prisma: PrismaClient
}

// type InternalTxData = Omit<UserInternalTx, 'id'>

const managerUserInternalTxHistory = async ({ prisma, chainId }: Props): Promise<any> => {
  if (!supportedTxChains[Number(chainId)]) {
    console.log(`No Internal Tx manager found for ${chainId}`)
    return
  }

  const provider = new AnkrProvider(process.env.ANKR_PROVIDER as string)
  const blockchain = supportedTxChains[Number(chainId)] as Blockchain

  const userInternalTxQueue = new Queue('userInternalTx')

  await userInternalTxQueue.obliterate({ force: true })

  const concurrencyRate = 100

  userInternalTxQueue.process(
    concurrencyRate,
    async (job: Queue.Job<{ id: number; mainAddress: string | null; hash: string }>) => {
      const { data: tx } = job

      console.log(`Starting job for tx: ${tx.hash}`)

      // get internal TXs
      const internalTx = await provider.getInternalTransactionsByParentHash({
        blockchain,
        parentTransactionHash: tx.hash,
        onlyWithValue: false,
      })

      for (const curr of internalTx.internalTransactions) {
        if (
          !tx.mainAddress ||
          (tx.mainAddress &&
            (curr.fromAddress.toLowerCase() === tx.mainAddress.toLowerCase() ||
              curr.toAddress.toLowerCase() === tx.mainAddress.toLowerCase()))
        ) {
          const newAddress = (tx.mainAddress === curr.toAddress ? curr.fromAddress : curr.toAddress) ?? ''
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

          // commit tx to db
          prisma.userInternalTx.upsert({
            where: {
              uid: {
                hash: curr.transactionHash,
                to: curr.toAddress,
                from: curr.fromAddress,
                chainId: Number(chainId),
              },
            },
            create: {
              chainId: Number(chainId),
              timestamp: new Date(Number(BigInt(curr.timestamp ?? '0') * BigInt('1000'))),
              block: BigInt(curr.blockHeight),
              hash: curr.transactionHash,
              value: curr.value,
              toName: '',
              fromName: '',
              to: curr.toAddress,
              from: curr.fromAddress,
              success: true,
              type: curr.callType,
              gasLimit: curr.gas,
              mainAddress: tx.mainAddress,
            },
            update: {},
          })
        }
      }

      await prisma.userTx.update({
        where: {
          id: tx.id,
        },
        data: {
          internalTxIndexed: true,
        },
      })

      console.log(`Completed job for tx: ${tx.hash}`)

      return Promise.resolve(true)
    }
  )

  let completed = false
  let _cursor = 0
  let total = 0

  const fetchMoreParentTx = async ({ cursor }: { cursor: number }) => {
    const parentTransactions = await prisma.userTx.findMany({
      where: {
        chainId: Number(chainId),
        internalTxIndexed: false,
      },
      select: {
        id: true,
        hash: true,
        mainAddress: true,
      },
      take: 50_000,
      orderBy: {
        id: 'asc',
      },
      ...(cursor > 0 ? { skip: 1, cursor: { id: cursor } } : {}),
    })

    if (parentTransactions.length === 0) {
      completed = true
      return cursor
    }

    for (const parentTx of parentTransactions) {
      userInternalTxQueue.add(parentTx)
    }

    const lastParentTx = parentTransactions[parentTransactions.length - 1]
    total += parentTransactions.length

    console.log(`Indexing parent transactions at cursor ${cursor}: ${total}`)

    return lastParentTx.id
  }

  _cursor = await fetchMoreParentTx({ cursor: _cursor })

  userInternalTxQueue.on('failed', async (job) => {
    return await job.retry()
  })

  userInternalTxQueue.on('drained', async () => {
    console.log(`Queue is empty`)
    if (completed) {
      userInternalTxQueue.close()
    } else {
      _cursor = await fetchMoreParentTx({ cursor: _cursor })
      userInternalTxQueue.resume()
    }
  })
}

export default managerUserInternalTxHistory
