import { PrismaClient } from '@prisma/client'
import { getAddress, isAddress } from 'viem'
import { grantFetch } from '../utils'
import { format } from 'date-fns'

type Props = {
  chainId: string
  prisma: PrismaClient
}

const managePassports = async ({ chainId, prisma }: Props) => {
  const passportScores = (await grantFetch(`passport_scores.json`)) as any[]
  const passportsCount = passportScores.length

  console.log(`${passportsCount} user passport scores found`)

  if (passportsCount === 0) {
    return
  }

  for (const [index, passport] of passportScores.entries()) {
    if (isAddress(passport.address)) {
      const address = getAddress(passport.address)
      const currentCount = index + 1
      const isLast = index + 1 === passportScores.length

      // TODO : Load stamps for this current user from redash

      const user = await prisma.user.findUnique({
        where: {
          address,
        },
      })

      if (user) {
        await prisma.passport.create({
          data: {
            userAddress: user.address,
            score: Number(passport.evidence.rawScore),
            scoreThreshold: Number(passport.evidence.threshold),
            scoreTimestamp: Number(format(new Date(passport.last_score_timestamp), 't')),
            updatedAt: Math.trunc(Date.now() / 1000),
            stamps: [],
          },
        })

        process.stdout.write(
          ` => Committed ${currentCount} of ${passportsCount} passports (${
            Math.round((currentCount / passportsCount) * 10000) / 100
          }%) ${isLast ? '\n' : '\r'}`
        )
      }
    }
  }
}

export default managePassports
