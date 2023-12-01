import fs from 'fs'
import { Readable } from 'stream'
import { finished } from 'stream/promises'
import { ReadableStream } from 'stream/web'
import { PrismaClient } from '@prisma/client'
import { getAddress, isAddress } from 'viem'
import { format } from 'date-fns'
import * as jsonl from 'node-jsonl'

type Props = {
  prisma: PrismaClient
}

type Passport = {
  passport: { address: string; community: number }
  score: string
  last_score_timestamp: string
  evidence?: {
    rawScore: string
    threshold: string
  }
  stamp_scores: Record<string, string>
}

const managePassports = async ({ prisma }: Props) => {
  const stream = fs.createWriteStream('./passport.jsonl')
  const { body } = await fetch('https://public.scorer.gitcoin.co/passport_scores/registry_score.jsonl')

  if (body) {
    console.log(`Start writing Passport data from stream`)
    await finished(Readable.fromWeb(body as ReadableStream<any>).pipe(stream))
  }

  console.log(`Finished writing Passport data from stream`)

  const rl = jsonl.readlines<Passport>('./passport.jsonl')

  let count = 0

  while (true) {
    const { value, done } = await rl.next()
    if (done) break

    const isUserAddress = isAddress(value.passport?.address)
    const isCorrectCommunity = Number(value.passport.community) === 335

    if (isUserAddress && isCorrectCommunity) {
      const user = await prisma.user.upsert({
        where: {
          address: getAddress(value.passport.address),
        },
        create: {
          address: getAddress(value.passport.address),
        },
        update: {},
      })

      if (user) {
        const update = {
          score: Number(value.evidence?.rawScore || '0'),
          scoreThreshold: Number(value.evidence?.threshold || '0'),
          scoreTimestamp: Number(format(new Date(value.last_score_timestamp), 't')),
          updatedAt: Math.trunc(Date.now() / 1000),
          stamps: value.stamp_scores,
        }

        await prisma.passport.upsert({
          where: {
            userAddress: user.address,
          },
          update,
          create: {
            userAddress: user.address,
            ...update,
          },
        })

        count += 1

        process.stdout.write(
          ` => Committed passport for ${value.passport.address} (${count} total!) ${done ? '\n' : '\r'}`
        )
      }
    }
  }
}

export default managePassports
