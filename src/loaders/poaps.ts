import { PrismaClient } from '@prisma/client'
import { getAddress } from 'viem'
import sdk from 'api'

const poapSdk = sdk('@poap/v1.0#lcw4v2g2llldijtcg')

poapSdk.auth(process.env.POAP_KEY as string)

type Props = {
  prisma: PrismaClient
  chainId: Number
}

type Poap = {
  event: {
    id: number
    fancy_id: string
    name: string
    event_url: string
    image_url: string
    country: string
    city: string
    description: string
    year: number
    start_date: string
    end_date: string
    expiry_date: string
    supply: number
  }
  tokenId: string
  owner: string
  chain: string
  created: string
}

const managePoaps = async ({ prisma, chainId }: Props) => {
  // get all users in specified chainId
  console.log(`Indexing user Poaps`)
  console.time('history')

  let cursor

  do {
    try {
      console.time('Index')

      const users: { id: number; voter: string }[] = await prisma.vote.findMany({
        // where: {
        //   chainId: Number(chainId),
        // },
        select: {
          id: true,
          voter: true,
        },
        distinct: ['voter'],
        take: 200,
        orderBy: {
          id: 'asc',
        },
        ...(cursor && { skip: 1, cursor: { id: cursor } }),
      })

      if (users.length === 0) {
        break
      }

      console.log(`${users.length} users loaded, working...`)

      // load their poaps
      const allPoaps = (await Promise.all(
        users.map((user) => poapSdk.gETActionsScan({ address: user.voter }).then(({ data }: { data: any }) => data))
      )) as Poap[][]

      // format data for db writes
      const data = []

      for (const userPoap of allPoaps) {
        if (userPoap.length > 0) {
          for (let i = 0; i < userPoap.length; i++) {
            const item = userPoap[i]

            data.push({
              ...item.event,
              poapId: item.event.id,
              id: undefined,
              tokenId: item.tokenId,
              owner: getAddress(item.owner),
              chain: item.chain,
              created: new Date(item.created).toISOString(),
              start_date: new Date(item.event.start_date).toISOString(),
              end_date: new Date(item.event.end_date).toISOString(),
              expiry_date: new Date(item.event.expiry_date).toISOString(),
            })
          }
        }
      }

      console.log(`Row grouping completed, ${data.length} groups found. Creating data chunks`)

      const chunkSize = 300
      const chunks = []

      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize)
        chunks.push(chunk)
      }

      console.log(`Data chunks done, writing chunks to database`)

      for (const chunk of chunks) {
        await prisma.poap.createMany({
          data: chunk,
          skipDuplicates: true,
        })
      }

      console.log(`Data chunk write finished, continuing...`)

      cursor = users[users.length - 1].id
    } catch (err) {
      console.log(err)
    }

    console.log(`At db cursor: ${cursor}`)

    console.timeEnd('Index')
    console.timeLog('history')
  } while ((cursor as number) > 0)
}

export default managePoaps
