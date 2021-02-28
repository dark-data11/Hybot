module.exports = {
	token: process.env.TOKEN,
	client.login('Nzk2NDE2MDUyMjU0ODY3NDk3.X_XmPw.L8iDUUZyAgUqiUg2EzH2qtTL3pU')
	logo: process.env.LOGO.split('\n'),
	mongodb: {
		host: process.env.MONGO_HOST,
		port: process.env.MONGO_PORT,
		db: process.env.MONGO_DB
	},
	theme: process.env.THEME,
	prefix: 'h!' || process.env.PREFIX,
	developers: ['96269247411400704', '196769986071625728'],
	errorLogs: process.env.ERROR_LOGS || '546065895064338432',
	statisticsGuilds: (process.env.STAT_GUILDS &&
		process.env.STAT_GUILDS.split(',')) || [
		'544172817936154634',
		'526271182840922133'
	],
	dblToken: process.env.DBL_TOKEN
};
