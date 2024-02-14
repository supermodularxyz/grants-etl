import axios from 'axios'
import { ethers } from 'ethers'
import { erc20Abi, formatUnits, getAddress, hexToBigInt, parseUnits } from 'viem'
import { AnkrProvider, Blockchain } from '@ankr.com/ankr.js'
import { chainConfig, clients } from './client'
import { roundABI } from '../abi/round'
import { payoutABI } from '../abi/payout'
import { getTokenPrice } from '../graphql'

type ApplicationTxProps = {
  chainId: string
  projectId: `0x${string}`
  block: string
  roundId: `0x${string}`
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

export type Price = {
  token: `0x${string}`
  code: string
  price: number
  timestamp: number
  block: number
}

const ankrProvider = new AnkrProvider(process.env.ANKR_PROVIDER as string)

export const supportedChains: Record<number, string> = {
  1: 'eth',
  10: 'optimism',
  137: 'polygon',
  250: 'fantom',
  42161: 'arbitrum',
  534352: 'scroll',
}

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

export const createExtraParams = (next_page_params: NextPageParams) => {
  return Object.keys(next_page_params).reduce((acc: string, curr: string, i: number) => {
    const value = next_page_params[curr as keyof NextPageParams]
    const prefix = acc ? '&' : ''
    return `${acc}${prefix}${curr}=${value}`
  }, '')
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

export const getLatestLogs = async ({ chainId, payoutContract }: { chainId: number; payoutContract: string }) => {
  return (
    (
      await ankrProvider.getLogs({
        blockchain: supportedChains[chainId] as Blockchain,
        topics: [['0xdc7180ca4affc84269428ed20ef950e745126f11691b010c4a7d49458421008f']],
        address: [payoutContract],
        pageSize: 100,
        decodeLogs: false,
        descOrder: true,
      })
    ).logs[0] || []
  )
}

export const fetchRoundDistributionData = async ({ chainId, roundId }: { chainId: number; roundId: `0x${string}` }) => {
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
        const log = await getLatestLogs({ chainId, payoutContract })

        let token = { price: 0, decimal: 18, code: 'ETH' }

        if (log && tokenAddress) {
          const targetBlockNumber = Number(log.blockNumber)
          const nTokenAddress = tokenAddress.toLowerCase()

          const tokenContractConfig = {
            address: nTokenAddress as `0x${string}`,
            abi: erc20Abi,
          }

          if (nTokenAddress !== ethers.constants.AddressZero) {
            const [{ result: decimal }, { result: code }] = await client.multicall({
              contracts: [
                {
                  ...tokenContractConfig,
                  functionName: 'decimals',
                },
                {
                  ...tokenContractConfig,
                  functionName: 'symbol',
                },
              ],
            })

            token.decimal = decimal as number
            token.code = code as string
          }

          const targetTokenPrice = (await getTokenPrice({
            chainId,
            tokenAddress: nTokenAddress,
            blockNumber: targetBlockNumber.toString(),
          })) as { prices: any[] }

          token.price = targetTokenPrice.prices[0].priceInUsd ?? 0
        }

        const res = await fetch(`https://d16c97c2np8a2o.cloudfront.net/ipfs/${metaPtr}`)

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
