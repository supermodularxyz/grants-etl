import { EthStaker, PrismaClient } from '@prisma/client'
import { clients } from '../utils/client'
import { erc20Abi } from 'viem'
import { ethers } from 'ethers'
import { Decimal } from '@prisma/client/runtime/library'

type Props = {
  prisma: PrismaClient
}

const tokens: `0x${string}`[] = [
  '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
  '0xac3E018457B222d93114458476f3E3416Abbe38F',
  '0xA35b1B31Ce002FBF2058D22F30f95D405200A15b',
  '0xae78736Cd615f374D3085123A210448E74Fc6393',
  '0xf951E335afb289353dc249e82926178EaC7DEd78',
  '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
  '0xFe2e637202056d30016725477c5da089Ab0A043A',
  '0xf1C9acDc66974dFB6dEcB12aA385b9cD01190E38',
]

const manageStakers = async ({ prisma }: Props) => {
  // load client
  const client = clients[1]

  // get all highscore users
  const highscoreUsers = await prisma.passport.findMany({
    where: {
      score: {
        gt: 0,
      },
    },
  })

  const usersTotalCount = highscoreUsers.length

  console.log(`Starting indexing for ${usersTotalCount} Passport users`)

  const tokenSymbols: string[] = (
    await client.multicall({
      contracts: tokens.map((i) => ({
        address: i,
        abi: erc20Abi,
        functionName: 'symbol',
      })),
    })
  ).map((i) => i.result as string)

  // use client to query token contracts for user balance
  for (let i = 0; i < usersTotalCount; i++) {
    const highScorer = highscoreUsers[i]

    console.log(`Indexing ${highScorer.userAddress}`)

    let success = true

    do {
      try {
        // get ether balance
        const etherBalance = await client.getBalance({
          address: highScorer.userAddress as `0x${string}`,
        })

        const timestamp = new Date()

        if (etherBalance > 0) {
          // get token balances
          console.log(`${highScorer.userAddress} ETH balance > 0`)
          const balances = (
            await client.multicall({
              contracts: tokens.map((address) => ({
                address,
                abi: erc20Abi,
                functionName: 'balanceOf',
                args: [highScorer.userAddress],
              })),
            })
          ).reduce<Omit<EthStaker, 'id'>[]>((acc, balanceResult, bIndex) => {
            const balance = BigInt(balanceResult.result ?? '0')
            if (balance > 0) {
              acc.push({
                wallet: highScorer.userAddress,
                symbol: tokenSymbols[bIndex],
                token: tokens[bIndex],
                balance: new Decimal(balance.toString()),
                timestamp,
              })
            }

            return acc
          }, [])

          balances.push({
            wallet: highScorer.userAddress,
            symbol: 'ETH',
            token: ethers.constants.AddressZero,
            balance: new Decimal(etherBalance.toString()),
            timestamp,
          })

          console.log(`Balances found for ${highScorer.userAddress}`)

          await prisma.ethStaker.createMany({
            data: balances,
            skipDuplicates: true,
          })
        }

        success = true
      } catch (error) {
        success = false
        console.log(error)
        console.log(`Failed request, trying again`)
      }
    } while (!success)

    console.log(`Completed indexing for ${highScorer.userAddress} (${i + 1} / ${usersTotalCount})`)
  }
}

export default manageStakers
