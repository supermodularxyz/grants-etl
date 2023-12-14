import { getAddress, isAddress } from 'viem'
import { loadExtraTxData } from '../utils'
import { PrismaClient } from '@prisma/client'

type Props = {
  prisma: PrismaClient
}

export type Row = {
  address: string
  chain: string
  arkhamEntity?: {
    name?: string
    note?: string
    id?: string
    type?: string
    service?: any
    addresses?: any
    website?: string
    twitter?: string
    crunchbase?: string
    linkedin?: string
  }
  arkhamLabel?: {
    name?: string
    address?: string
    chainType?: string
  }
  isUserAddress: boolean
  contract: boolean
}

type UserArkhamData = {
  address: string
  chain: string
  entity_name?: string
  entity_note?: string
  entity_id?: string
  entity_type?: string
  entity_service?: string
  entity_addresses?: any
  entity_website?: string
  entity_twitter?: string
  entity_crunchbase?: string
  entity_linkedin?: string
  label_name?: string
  label_address?: string
  label_chainType?: string
  contract: boolean
  isUserAddress: boolean
}

const managerArkham = async ({ prisma }: Props): Promise<any> => {
  // load all users count
  const userCount = await prisma.user.count()

  console.log(`Indexing ${userCount} users`)
  console.time('arkham')

  if (userCount === 0) {
    console.log(`No users found`)
    return
  }

  let cursor

  do {
    try {
      console.time('Index')
      // pick off users based on id and increment till end of list
      const users: { id: number; address: string }[] = await prisma.user.findMany({
        take: 5,
        orderBy: {
          id: 'asc',
        },
        ...(cursor && { skip: 1, cursor: { id: cursor } }),
      })

      if (users.length === 0) {
        break
      }

      const rawTxs = (await Promise.all(
        users.map((user) =>
          fetch(`https://api.arkhamintelligence.com/intelligence/address/${user.address}/all`, {
            headers: {
              'API-Key': process.env.ARKHAM_KEY as string,
            },
          }).then(async (r) => ({
            address: user.address,
            response: await r.json(),
          }))
        )
      )) as {
        address: string
        response: Record<string, Row>
      }[]

      console.log(`Arkham request completed, starting row grouping`)

      const data: UserArkhamData[] = []

      for (const row of rawTxs) {
        const arkhamResps = Object.values(row.response)
        for (let i = 0; i < arkhamResps.length; i++) {
          const item = arkhamResps[i]

          data.push({
            address: row.address,
            chain: item.chain,
            entity_name: item.arkhamEntity?.name,
            entity_note: item.arkhamEntity?.note,
            entity_id: item.arkhamEntity?.id,
            entity_type: item.arkhamEntity?.type,
            entity_service: item.arkhamEntity?.service,
            entity_addresses: item.arkhamEntity?.addresses,
            entity_website: item.arkhamEntity?.website,
            entity_twitter: item.arkhamEntity?.twitter,
            entity_crunchbase: item.arkhamEntity?.crunchbase,
            entity_linkedin: item.arkhamEntity?.linkedin,
            label_name: item.arkhamLabel?.name,
            label_address: item.arkhamLabel?.address,
            label_chainType: item.arkhamLabel?.chainType,
            contract: item.contract,
            isUserAddress: item.isUserAddress,
          })
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
        await prisma.arkham.createMany({
          data: chunk,
          skipDuplicates: true,
        })
      }

      cursor = users[users.length - 1].id

      console.log(`At user index ${cursor}`)
      console.timeEnd('Index')
      console.timeLog('arkham')
    } catch (error) {
      console.log(`Something failed, retrying in few seconds...`)
    }

    await new Promise((res, rej) => setTimeout(res, 1500))
  } while ((cursor as number) > 0)
}

export default managerArkham
