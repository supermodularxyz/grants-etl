import { createPublicClient, http } from 'viem'
import { fantom, mainnet, optimism, arbitrum, polygon } from 'viem/chains'

export const chainConfig = {
  1: {
    rpc: process.env.MAINNET_RPC,
    chain: mainnet,
  },
  10: {
    rpc: process.env.OP_RPC,
    chain: optimism,
  },
  137: {
    rpc: process.env.POLYGON_RPC,
    chain: polygon,
  },
  250: {
    rpc: process.env.FANTOM_RPC,
    chain: fantom,
  },
  42161: {
    rpc: process.env.ARB_RPC,
    chain: arbitrum,
  },
  424: {
    rpc: process.env.PGN_RPC,
    chain: {
      id: 424,
      name: 'Public Goods Network',
      network: 'PGN',
      nativeCurrency: {
        decimals: 18,
        name: 'Ethereum',
        symbol: 'ETH',
      },
      rpcUrls: {
        public: { http: ['https://rpc.publicgoods.network'] },
        default: { http: ['https://rpc.publicgoods.network'] },
      },
      blockExplorers: {
        etherscan: { name: 'PGN Explorer', url: 'https://explorer.publicgoods.network' },
        default: { name: 'PGN Explorer', url: 'https://explorer.publicgoods.network' },
      },
    },
  },
}

const createClient = (chainId: keyof typeof chainConfig) =>
  createPublicClient({
    chain: chainConfig[chainId].chain,
    transport: http(chainConfig[chainId].rpc),
  })

export const explorers: Record<number, string> = {
  1: 'https://eth.blockscout.com',
  10: 'https://optimism.blockscout.com',
  424: 'https://explorer.publicgoods.network',
}

export const clients = {
  1: createClient(1),
  10: createClient(10),
  137: createClient(137),
  250: createClient(250),
  42161: createClient(42161),
  424: createClient(424),
}
