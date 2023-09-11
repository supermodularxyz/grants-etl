import { PrismaClient } from '@prisma/client'
import axios from 'axios'

type Props = {
  chainId: string
  prisma: PrismaClient
}

type Row = {
  id?: number
  address: string
  provider: string
  stamp: any
  created_at?: string
  updated_at?: string
}

const apiKey = process.env.STAMPS_API
const stampUrl = process.env.STAMP_URL
const queryId = 43

const headers = {
  headers: {
    Authorization: `Key ${apiKey}`,
  },
}

const managerUserStamps = async ({ chainId, prisma }: Props): Promise<any> => {
  // load all users count
  const userCount = await prisma.user.count()

  console.log(`Indexing ${userCount} user stamps`)

  if (userCount === 0) {
    console.log(`No users found`)
    return
  }

  let cursor

  do {
    // pick off users based on id and increment till end of list
    const users: { id: number; address: string }[] = await prisma.user.findMany({
      take: 20,
      orderBy: {
        id: 'asc',
      },
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
    })

    if (users.length === 0) {
      break
    }

    cursor = users[users.length - 1].id

    const userAddresses = users.map((u) => `'${u.address.toLowerCase()}'`).join(',')

    const refreshUrl = `${stampUrl}/api/queries/${queryId}/results`

    const refreshResponse = await axios.post(
      refreshUrl,
      { parameters: { wallet_list: userAddresses }, max_age: 0 },
      headers
    )

    const jobId = refreshResponse.data.job.id

    let jobStatus = 1
    let jobData

    do {
      const jobUrl = `${stampUrl}/api/jobs/${jobId}`

      const jobResponse = await axios.get(jobUrl, headers)

      jobData = jobResponse.data
      jobStatus = jobResponse.data.job.status

      if (jobStatus === 3) {
        console.log('Query refresh completed!')
        break
      }

      if (jobStatus === 4) {
        console.log('Query refresh failed!')
        break
      }

      console.log(`5 seconds wait before next check for job completion`)
      await new Promise((resolve) => setTimeout(resolve, 5000))
    } while (jobStatus < 3)

    console.log(jobData)

    const jobUrl = `${stampUrl}/api/queries/${queryId}/results/${jobData.job.query_result_id}.json`

    const jobResponse = await axios.get(jobUrl, headers)

    const rows = jobResponse.data.query_result.data.rows as Row[]

    const chunkSize = 300
    const chunks = []

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize)
      chunks.push(chunk)
    }

    for (const chunk of chunks) {
      await prisma.stamp.createMany({
        data: chunk,
      })
    }

    console.log(`At user index ${cursor}`)
  } while ((cursor as number) > 0)
}

export default managerUserStamps
