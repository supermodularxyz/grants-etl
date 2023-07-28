# 🔭 Grants Data cache & ETL Pipeline

> For exploring grants data using SQL queries in Postgres

![DB schema visualized](./assets/schema-visual.png)

## 🏁 Quick start

- Install Docker. Visit [https://www.docker.com/](https://www.docker.com/) to install.

- After Docker installation, open Terminal to this repo location and run:

```bash
docker compose up
```

- Once all containers are running and healthy, open `http://localhost:5555` to open PGAdmin.

- Login using default login details:

```
Email: sybilx@supermodular.xyz
Password: admin
```

- Load and configure your server:

| Config Name       | Value                |
| ----------------- | -------------------- |
| Host name/address | host.docker.internal |
| Port              | 5432                 |
| Username          | postgres             |
| Password          | postgres             |
  
![PGAdmin add new server](./assets/pgadmin-dashboard.png)
![PGAdmin server name](./assets/server-hostname.png)
![PGAdmin add server config](./assets/server-config.png)

All done 🎉

## Run sample query

- Click on the Query tool:

![PGAdmin run new query](./assets/pgadmin-newquery.png)

- Run sample query that gets top 10 donors (by USD amount) on the Ethereum Mainnet across all previous Rounds:

```sql
SELECT * FROM public."Vote"
	WHERE "roundId" IN (SELECT id from public."Round" WHERE "chainId" = 1)
	ORDER BY "amountUSD" DESC LIMIT 10
```

**PS**: DB Schema file is located in `./prisma/schema.prisma`
