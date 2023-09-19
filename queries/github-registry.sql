-- Create a registry of all projects that have been approved and have a GitHub project link
-- Note: projects will be duplicated if they have been approved in multiple rounds

SELECT 
    "projectId",
    "project_name",
    "project_github",
    "payoutAddress",
    "amountUSD",
    "uniqueContributors",
    "project_desc"
FROM public."ProjectsInRounds"
WHERE 
    "status" = 'APPROVED' AND
    "uniqueContributors" > 0 AND
    "project_github" <> '' AND
    "project_github" <> 'https://github.com/gitcoinco'