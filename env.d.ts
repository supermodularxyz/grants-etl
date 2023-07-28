declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production'
      GRANTS_BASE_URL: string
    }
  }
}
