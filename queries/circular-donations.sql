-- All transactions where donor is seemingly donating to themselves.
SELECT v."transaction",
       v.voter,
       v."roundId",
       v."amountUSD"
FROM public."Vote" AS v
WHERE v.voter = v."grantAddress";
