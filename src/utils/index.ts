import axios from 'axios'
import { chainConfig, clients } from './client'
import { Row } from '../loaders/userTxHistory'

export const grantFetch = async (path: string) => {
  try {
    const res = await axios.get(`${process.env.GRANTS_BASE_URL}/${path}`)

    return res.data
  } catch (error) {
    console.log(error)
    console.log(`Grant request failed: ${path}`)

    return []
  }
}

export const initialFetch = async (chainId: string) => {
  try {
    const block = await clients[Number(chainId) as keyof typeof clients].getBlock()

    console.log(`Current block on chainId ${chainId} is ${block.number?.toString()}`)
  } catch (error) {}
}

type ApplicationTxProps = {
  chainId: string
  projectId: `0x${string}`
  block: string
  roundId: `0x${string}`
}

export const getApplicationTx = async ({ chainId, projectId, block, roundId }: ApplicationTxProps) => {
  const client = clients[Number(chainId) as keyof typeof chainConfig]

  const logs = await client.getLogs({
    address: roundId,
    event: {
      anonymous: false,
      inputs: [
        { indexed: true, internalType: 'bytes32', name: 'projectID', type: 'bytes32' },
        { indexed: false, internalType: 'uint256', name: 'applicationIndex', type: 'uint256' },
        {
          components: [
            { internalType: 'uint256', name: 'protocol', type: 'uint256' },
            { internalType: 'string', name: 'pointer', type: 'string' },
          ],
          indexed: false,
          internalType: 'struct MetaPtr',
          name: 'applicationMetaPtr',
          type: 'tuple',
        },
      ],
      name: 'NewProjectApplication',
      type: 'event',
    },
    args: {
      projectID: projectId,
    },
    fromBlock: BigInt(block),
    toBlock: BigInt(block) + BigInt(1),
  })

  const tx = await client.getTransaction({
    hash: logs[0].transactionHash as `0x${string}`,
  })

  return tx
}

export const logger = (...args: any) => {
  console.log(...args)
}

export const handleDateString = (timestamp: any) => {
  const formattedDateString = new Date(Number(timestamp)).valueOf()

  return String(Number.isNaN(formattedDateString) ? new Date().valueOf() + 157680000 : formattedDateString)
}

export const loadExtraTxData = async ({
  address,
  next_page_params,
}: {
  address: string
  next_page_params: { block_number: number; index: number; items_count: number }
}): Promise<Row[]> => {
  const extraParams = `block_number=${next_page_params['block_number']}&index=${next_page_params['index']}&items_count=${next_page_params['items_count']}`

  const res = (await fetch(
    `https://explorer.publicgoods.network/api/v2/addresses/${address}/transactions?filter=to%20%7C%20from&${extraParams}`
  ).then((r) => r.json())) as {
    items: Row[]
    next_page_params?: any
  }

  return [
    ...res.items,
    ...(res.next_page_params ? await loadExtraTxData({ address, next_page_params: res.next_page_params }) : []),
  ]
}
