import { PrismaClient } from '@prisma/client'

type Props = {
  prisma: PrismaClient
}

const reformatAddress = async ({ prisma }: Props) => {
  console.log(`Updating users`)

  const resp = await prisma.$executeRaw`UPDATE "User" SET address = LOWER(address)`

  console.log({ resp })

  console.log(`Updated user fields`)
}

export default reformatAddress
