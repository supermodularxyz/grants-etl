import { createPublicClient, http } from 'viem'
import { fantom, mainnet, optimism } from 'viem/chains'

export const chainConfig = {
  1: {
    rpc: process.env.MAINNET_RPC,
    chain: mainnet,
  },
  10: {
    rpc: process.env.OP_RPC,
    chain: optimism,
  },
  250: {
    rpc: process.env.FANTOM_RPC,
    chain: fantom,
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

export const clients = {
  1: createClient(1),
  10: createClient(10),
  250: createClient(250),
  424: createClient(424),
}
