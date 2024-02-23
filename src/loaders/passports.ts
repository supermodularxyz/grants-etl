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
  rounds: { chainId: number; roundId: string }[]
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

const managePassports = async ({ prisma, rounds = [] }: Props) => {
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
    const address = value.passport.address.toLowerCase()

    if (isUserAddress && isCorrectCommunity) {
      const user = await prisma.user.upsert({
        where: {
          address,
        },
        create: {
          address,
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

        if (rounds.length === 0) {
          await prisma.passport.upsert({
            where: {
              userAddress: address,
            },
            update,
            create: {
              userAddress: address,
              ...update,
            },
          })
        } else {
          for (const round of rounds) {
            await prisma.passportArchive.upsert({
              where: {
                uid: {
                  userAddress: address,
                  roundId: round.roundId,
                },
              },
              update: {},
              create: { ...update, ...round, userAddress: address },
            })
          }
        }

        count += 1

        process.stdout.write(` => Committed passport for ${address} (${count} total) ${done ? '\n' : '\r'}`)
      }
    }
  }

  if (rounds.length > 0) {
    for (let i = 0; i < rounds.length; i++) {
      const round = rounds[i]

      prisma.round.update({
        where: {
          uid: round,
        },
        data: {
          addedLastPassports: true,
        },
      })
    }
  }
}

export default managePassports
