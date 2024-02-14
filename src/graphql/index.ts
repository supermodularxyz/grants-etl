import request, { gql } from 'graphql-request'

export type GraphQLResponse<K> = {
  round: K
}

export const gqlRequest = async (document: any, variable: any) => {
  return await request(`https://grants-stack-indexer-v2.gitcoin.co/graphql`, document, variable)
}

export const getRounds = async (chainId: number) => {
  return gqlRequest(
    gql`
      query getRounds($chainId: Int = 10) {
        rounds(condition: { chainId: $chainId }) {
          id
          chainId
          applicationMetadata
          applicationMetadataCid
          applicationsEndTime
          applicationsStartTime
          createdAtBlock
          donationsEndTime
          donationsStartTime
          managerRole
          matchAmount
          matchAmountInUsd
          matchTokenAddress
          projectId
          roundMetadata
          roundMetadataCid
          strategyAddress
          strategyId
          strategyName
          tags
          totalAmountDonatedInUsd
          totalDonationsCount
          uniqueDonorsCount
          updatedAtBlock
        }
      }
    `,
    { chainId }
  )
}

export const getApplications = async ({ chainId, roundId }: { chainId: number; roundId: string }) => {
  return gqlRequest(
    gql`
      query getApplications($roundId: String = "", $chainId: Int = 10) {
        round(chainId: $chainId, id: $roundId) {
          applications {
            id
            projectId
            roundId
            status
            metadataCid
            uniqueDonorsCount
            totalDonationsCount
            totalAmountDonatedInUsd
            statusUpdatedAtBlock
            createdAtBlock
            chainId
            metadata
          }
        }
      }
    `,
    { chainId, roundId }
  )
}

export const getVotes = async ({ chainId, roundId }: { chainId: number; roundId: string }) => {
  return gqlRequest(
    gql`
      query getVotes($roundId: String = "", $chainId: Int = 10) {
        round(chainId: $chainId, id: $roundId) {
          donations {
            amount
            amountInRoundMatchToken
            amountInUsd
            applicationId
            blockNumber
            chainId
            donorAddress
            id
            projectId
            recipientAddress
            roundId
            tokenAddress
            transactionHash
          }
        }
      }
    `,
    { chainId, roundId }
  )
}

export const getTokenPrice = async ({
  chainId,
  tokenAddress,
  blockNumber,
}: {
  chainId: number
  tokenAddress: string
  blockNumber: string
}) => {
  return gqlRequest(
    gql`
      query getTokenPrice($tokenAddress: String = "", $chainId: Int = 10, $blockNumber: BigFloat = "") {
        prices(
          orderBy: BLOCK_NUMBER_DESC
          filter: {
            tokenAddress: { equalTo: $tokenAddress }
            chainId: { equalTo: $chainId }
            blockNumber: { lessThanOrEqualTo: $blockNumber }
          }
          first: 1
        ) {
          id
          chainId
          priceInUsd
          blockNumber
        }
      }
    `,
    { chainId, tokenAddress, blockNumber }
  )
}
