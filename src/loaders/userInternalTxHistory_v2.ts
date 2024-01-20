import { getAddress, isAddress } from 'viem'
import { PrismaClient, UserInternalTx } from '@prisma/client'
import { AnkrProvider, Blockchain } from '@ankr.com/ankr.js'
import { supportedTxChains } from '../utils/tx'

type Props = {
  chainId: string
  prisma: PrismaClient
}

type InternalTxData = Omit<UserInternalTx, 'id'>

const managerUserInternalTxHistory = async ({ prisma, chainId }: Props): Promise<any> => {
  if (!supportedTxChains[Number(chainId)]) {
    console.log(`No Internal Tx manager found for ${chainId}`)
    return
  }

  // load all users count
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
  })

  const parentTxCount = parentTransactions.length

  console.log(`Indexing ${parentTxCount} parent transactions`)
  console.time('history')

  if (parentTxCount === 0) {
    console.log(`No parent transactions found`)
    return
  }

  // split voters list into chunks
  const txsGroup = []

  for (let i = 0; i < parentTransactions.length; i += 200) {
    const chunk = parentTransactions.slice(i, i + 200)
    txsGroup.push(chunk)
  }

  let cursor = 0

  const provider = new AnkrProvider(process.env.ANKR_PROVIDER as string)
  const blockchain = supportedTxChains[Number(chainId)] as Blockchain

  do {
    try {
      console.time('Index')

      const txs: { id: number; hash: string; mainAddress: string | null }[] = txsGroup[cursor]

      if (!txs || txs.length === 0) {
        break
      }

      const userTxWithIndexedInternalTx: number[] = []

      const rawTxs = (
        await Promise.all(
          txs.map((tx) =>
            provider
              .getInternalTransactionsByParentHash({
                blockchain,
                parentTransactionHash: tx.hash,
                onlyWithValue: false,
              })
              .then((r) => {
                const filteredTx = tx.mainAddress
                  ? r.internalTransactions.filter(
                      (i) =>
                        i.fromAddress.toLowerCase() === tx.mainAddress?.toLowerCase() ||
                        i.toAddress.toLowerCase() === tx.mainAddress?.toLowerCase()
                    )
                  : r.internalTransactions

                userTxWithIndexedInternalTx.push(tx.id)

                return { internalTransactions: filteredTx, mainAddress: tx.mainAddress }
              })
          )
        )
      ).reduce((acc, curr) => {
        const formattedRow = curr.internalTransactions.map((i) => ({
          chainId: Number(chainId),
          timestamp: new Date(Number(BigInt(i.timestamp ?? '0') * BigInt('1000'))),
          block: BigInt(i.blockHeight),
          hash: i.transactionHash,
          value: i.value,
          toName: '',
          fromName: '',
          to: i.toAddress,
          from: i.fromAddress,
          success: true,
          type: i.callType,
          gasLimit: i.gas,
          mainAddress: curr.mainAddress,
        }))

        return [...acc, ...formattedRow]
      }, <InternalTxData[]>[])

      // TODO : Mark hash as resolved for next time indexing

      const data: InternalTxData[] = []

      for (const row of rawTxs) {
        const newAddress = (row.mainAddress === row.to ? row.from : row.to) ?? ''
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

        data.push(row)
      }

      console.log(`Row grouping completed, ${data.length} groups found. Creating data chunks`)

      const chunkSize = 300
      const chunks = []

      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize)
        chunks.push(chunk)
      }

      console.log(`Data chunks done, writing chunks to database`)

      for (const chunk of chunks) {
        await prisma.userInternalTx.createMany({
          data: chunk,
          skipDuplicates: true,
        })
      }

      if (userTxWithIndexedInternalTx.length > 0) {
        await prisma.userTx.updateMany({
          where: {
            id: {
              in: userTxWithIndexedInternalTx,
            },
          },
          data: {
            internalTxIndexed: true,
          },
        })
      }

      cursor += 1

      console.log(`At user index ${cursor}`)
      console.timeEnd('Index')
      console.timeLog('history')
    } catch (error) {
      console.log(error)

      console.log(`Something failed, retrying in few seconds...`)
      await new Promise((res, rej) => setTimeout(res, 60000))
    }
  } while ((cursor as number) > 0)
}

export default managerUserInternalTxHistory
