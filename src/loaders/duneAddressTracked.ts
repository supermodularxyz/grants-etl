import { PrismaClient } from '@prisma/client'
import axios from 'axios'
import { json2csv } from 'json-2-csv'

type Props = {
  chainId?: string
  prisma: PrismaClient
}

const duneAddressTracked = async ({ prisma }: Props): Promise<any> => {
  const result: any[] = await prisma.$queryRaw`WITH CombinedAddresses AS (
      SELECT 
          DISTINCT LOWER("userAddress") AS "address"
      FROM 
          "public"."Passport"
      WHERE 
          "score" > 0
      UNION 
      SELECT 
          LOWER("voter") AS "address"
      FROM 
          "public"."Vote"
  ),
  PassportStatus AS (
      SELECT
          LOWER("userAddress") AS "address",
          TRUE AS "isPassportHolder",
          "score",
          TIMESTAMP 'epoch' + ("public"."Passport"."scoreTimestamp") * INTERVAL '1 second' as "scoreTimestamp"
      FROM
          "public"."Passport"
  ),
  VoteStatus AS (
      SELECT 
          DISTINCT LOWER("voter") AS "address",
          TRUE AS "isVoter"
      FROM 
          "public"."Vote"
  )
  SELECT
      ca."address",
      COALESCE(vs."isVoter", FALSE) AS "isVoter",
      COALESCE(ps."isPassportHolder", FALSE) AS "isPassportHolder",
      "score",
      "scoreTimestamp"
  FROM 
      CombinedAddresses ca
  LEFT JOIN 
      VoteStatus vs ON ca."address" = vs."address"
  LEFT JOIN 
      PassportStatus ps ON ca."address" = ps."address"
  `

  console.log(`Pushing update for Passport users: ${result.length}`)

  const data = json2csv(result)

  const { data: response } = await axios.post(
    `https://api.dune.com/api/v1/table/upload/csv`,
    {
      table_name: 'passport',
      data,
    },
    {
      headers: {
        'X-Dune-Api-Key': process.env.DUNE_API_KEY as string,
      },
    }
  )

  if (response.success) {
    console.log(`Passport upload completed`)
  }
}

export default duneAddressTracked
