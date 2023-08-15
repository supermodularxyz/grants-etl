declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production'
      GRANTS_BASE_URL: string
      MAINNET_RPC?: string
      OP_RPC?: string
      FANTOM_RPC?: string
      PGN_RPC?: string
    }
  }
}
