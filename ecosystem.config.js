module.exports = {
  apps: [
    {
      name: 'etl:1',
      script: 'yarn',
      args: 'run etl:1',
    },
    {
      name: 'etl:10',
      script: 'yarn',
      args: 'run etl:10',
    },
    {
      name: 'etl:250',
      script: 'yarn',
      args: 'run etl:250',
    },
    {
      name: 'etl:424',
      script: 'yarn',
      args: 'run etl:424',
    },
  ],
}
