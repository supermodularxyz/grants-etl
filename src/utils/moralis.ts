import Moralis from 'moralis'
import { toHex } from 'viem'

export enum TOKENTYPE {
  ERC20,
  NFT,
}

export const getLatestLogs = async ({ chainId, address }: { chainId: number; address: `0x${string}` }) => {
  try {
    const response = await Moralis.EvmApi.events.getContractEvents({
      chain: toHex(chainId),
      topic: '0xdc7180ca4affc84269428ed20ef950e745126f11691b010c4a7d49458421008f',
      address,
      abi: {
        anonymous: false,
        inputs: [
          { indexed: false, internalType: 'bytes32', name: 'merkleRoot', type: 'bytes32' },
          {
            components: [
              { internalType: 'uint256', name: 'protocol', type: 'uint256' },
              { internalType: 'string', name: 'pointer', type: 'string' },
            ],
            indexed: false,
            internalType: 'struct MetaPtr',
            name: 'distributionMetaPtr',
            type: 'tuple',
          },
        ],
        name: 'DistributionUpdated',
        type: 'event',
      },
    })

    return response.raw.result
  } catch (error) {
    return []
  }
}

export const moralisLoader = async ({
  chain,
  address,
  fromBlock = 0,
  tokenType,
}: {
  chain: string
  address: string
  fromBlock: number
  tokenType: TOKENTYPE
}) => {
  let cursor = ''
  let data: any[] = []

  const handler =
    tokenType === TOKENTYPE.ERC20
      ? Moralis.EvmApi.token.getWalletTokenTransfers
      : Moralis.EvmApi.nft.getWalletNFTTransfers

  do {
    // TODO : Implement the loader for which type
    const res = await handler({
      chain,
      address,
      ...(fromBlock > 0 ? { fromBlock } : {}),
      ...(cursor.length > 0 ? { cursor } : {}),
    })

    cursor = res.raw.cursor ?? ''

    data = [...data, ...res.raw.result]
  } while (cursor.length > 0)

  return data
}
