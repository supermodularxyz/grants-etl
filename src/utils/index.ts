import axios from 'axios'
import { chainConfig, clients } from './client'
import { Row } from '../loaders/userTxHistory'
import { InternalRow } from '../loaders/userInternalTxHistory'

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

type NextPageParams = {
  block_number: number
  index: number
  items_count: number
  transaction_index?: number
}

type ExtraParamsArgs = {
  url: string
  next_page_params: NextPageParams
}

export const loadExtraTxData = async ({ url, next_page_params }: ExtraParamsArgs): Promise<(Row | InternalRow)[]> => {
  const extraParams = Object.keys(next_page_params).reduce((acc: string, curr: string, i: number) => {
    const value = next_page_params[curr as keyof NextPageParams]
    const prefix = acc ? '&' : ''
    return `${acc}${prefix}${curr}=${value}`
  }, '')

  let success = false
  let res = undefined

  do {
    try {
      res = (await fetch(`${url}&${extraParams}`).then((r) => r.json())) as {
        items: Row[] | InternalRow[]
        next_page_params?: NextPageParams
      }

      console.log(`Beat... ${url}`)

      await new Promise((res, rej) => setTimeout(res, 1000))

      success = true
    } catch (error) {
      console.log(`Beat failed, trying again in a second`)
      await new Promise((res, rej) => setTimeout(res, 1000))
    }
  } while (!success)

  if (res) {
    return [
      ...res.items,
      ...(res.next_page_params ? await loadExtraTxData({ url, next_page_params: res.next_page_params }) : []),
    ]
  } else {
    return []
  }
}
