import axios from 'axios'
import { ethers } from 'ethers'
import { chainConfig, clients } from './client'
import { Row } from '../loaders/userTxHistory'
import { InternalRow } from '../loaders/userInternalTxHistory'
import { roundABI } from '../abi/round'
import { payoutABI } from '../abi/payout'
import { erc20Abi, formatUnits, getAddress, hexToBigInt, parseUnits } from 'viem'
import { getLatestLogs } from './moralis'
import { pgn } from 'viem/chains'

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
  lastBlock: number
}

export const loadExtraTxData = async ({
  url,
  next_page_params,
  lastBlock = 0,
}: ExtraParamsArgs): Promise<(Row | InternalRow)[]> => {
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
    const rowBlocks = new Set(res.items.map((i) => i.block))
    const canLoadMore = !rowBlocks.has(lastBlock)

    return [
      ...res.items,
      ...(canLoadMore && res.next_page_params
        ? await loadExtraTxData({ url, next_page_params: res.next_page_params, lastBlock })
        : []),
    ]
  } else {
    return []
  }
}

export const fetchBlockTimestamp = async ({ chainId, blockNumbers }: { chainId: number; blockNumbers: number[] }) => {
  return await Promise.all(
    blockNumbers.map((blockNumber) =>
      clients[Number(chainId) as keyof typeof clients]
        .getBlock({ blockNumber: BigInt(blockNumber) })
        .then((block) => block.timestamp)
    )
  )
}

export type Price = {
  token: `0x${string}`
  code: string
  price: number
  timestamp: number
  block: number
}

export const getPGNPayoutBlock = async ({ payoutContract }: { payoutContract: `0x${string}` }) => {
  try {
    const res = await fetch(`https://explorer.publicgoods.network/api/v2/addresses/${payoutContract}/logs`)

    return ((await res.json()).items as any[])
      .sort((a, b) => b.block_number - a.block_number)
      .find((i) => i.topics[0] === '0xdc7180ca4affc84269428ed20ef950e745126f11691b010c4a7d49458421008f')
  } catch (error) {
    return undefined
  }
}

export const fetchRoundDistributionData = async ({
  chainId,
  roundId,
  priceList,
}: {
  chainId: number
  roundId: `0x${string}`
  priceList: Price[]
}) => {
  try {
    const client = clients[Number(chainId) as keyof typeof clients]

    const payoutContract = getAddress(
      await client.readContract({
        address: roundId,
        abi: roundABI,
        functionName: 'payoutStrategy',
      })
    ) as `0x${string}`

    const contractConfig = {
      address: payoutContract,
      abi: payoutABI,
    }

    const [{ result: metaData }, { result: tokenAddress }] = await client.multicall({
      contracts: [
        {
          ...contractConfig,
          functionName: 'distributionMetaPtr',
        },
        {
          ...contractConfig,
          functionName: 'tokenAddress',
        },
      ],
    })

    if (metaData) {
      const [_, metaPtr] = metaData

      if (metaPtr && metaPtr.length > 0) {
        const logs =
          chainId === pgn.id
            ? await getPGNPayoutBlock({ payoutContract })
            : (await getLatestLogs({ chainId, address: payoutContract }))[0]

        let token = { price: 0, decimal: 18, code: 'ETH' }

        if (logs && tokenAddress) {
          const targetBlockNumber = Number(logs.block_number)
          const nTokenAddress = tokenAddress.toLowerCase()

          token.decimal =
            nTokenAddress === ethers.constants.AddressZero
              ? 18
              : await client.readContract({
                  address: nTokenAddress as `0x${string}`,
                  abi: erc20Abi,
                  functionName: 'decimals',
                })

          const tokenPrices = priceList.filter((i) => i.token === nTokenAddress).sort((a, b) => b.block - a.block)
          const targetTokenPrice = tokenPrices.find((i) => i.token === nTokenAddress && i.block <= targetBlockNumber)

          token.price = targetTokenPrice?.price ?? 0
          token.code = targetTokenPrice?.code ?? 'ETH'
        }

        const res = await fetch(`https://ipfs.io/ipfs/${metaPtr}`)

        const distro = await res.json()

        return {
          token,
          results: distro?.matchingDistribution || null,
        }
      }
    }
  } catch (error) {
    console.log(error)

    console.log(`Error occurred while fetching round distro data for ${roundId}`)
  }

  return null
}

export const formatDistributionPrice = ({
  amount,
  price,
  decimal,
}: {
  amount: `0x${string}`
  price: number
  decimal: number
}) => {
  return Number(formatUnits(hexToBigInt(amount) * parseUnits(price.toString(), decimal), decimal + 18))
}
