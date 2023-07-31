SELECT * FROM public."Vote"
	WHERE "roundId" IN (SELECT id from public."Round" WHERE "chainId" = 1)
	ORDER BY "amountUSD" DESC LIMIT 10