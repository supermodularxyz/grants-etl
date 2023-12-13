--Creates a dataframe that can be used as an edgelist fo standard input in graph analysis. 
--field contain a from, to, and weight field as well node properties for projects (name and grant address)

SELECT
    v."voter" AS from_node,
    pir."projectId" AS to_node,
    SUM(v."amountUSD") AS weight,
    pir."project_name",
    v."grantAddress"
FROM
    public."Vote" v
JOIN
    public."ProjectsInRounds" pir ON v."projectId" = pir."projectId"
GROUP BY
    v."voter", pir."projectId", pir."project_name", v."grantAddress"
ORDER BY
    weight DESC;
