-- Shows the top contributors by USD value of votes cast 
-- as well as the number of unique projects/addresses and rounds they have voted on.
SELECT
    "voter",
    SUM("amountUSD") AS "sumUSD",
    COUNT(DISTINCT "projectId") AS "uniqueProjects",
    COUNT(DISTINCT "grantAddress") AS "uniqueGrantAddresses",
    COUNT(DISTINCT "roundId") AS "uniqueRounds"
FROM public."Vote"
GROUP BY "voter"
ORDER BY "sumUSD" DESC;
