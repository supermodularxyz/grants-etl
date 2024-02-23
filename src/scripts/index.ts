import { PrismaClient } from '@prisma/client'

type Props = {
  prisma: PrismaClient
}

const reformatAddress = async ({ prisma }: Props) => {
  // users
  const users = await prisma.user.findMany()

  console.log(`Updating ${users.length} users`)

  for (const [index, user] of users.entries()) {
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        address: user.address.toLowerCase(),
      },
    })

    console.log(`Updated ${index + 1} user: ${user.address}`)
  }

  console.log(`Updated user fields`)
}

export default reformatAddress
