module.exports = {
	token: process.env.TOKEN,
	logo: process.env.LOGO.split('\n'),
	mongodb: {
		host: process.env.MONGO_HOST,
		port: process.env.MONGO_PORT,
		db: process.env.MONGO_DB
	},
	theme: process.env.THEME,
	prefix: 'h!' || process.env.PREFIX,
	developers: ['96269247411400704', '196769986071625728'],
	errorLogs: process.env.ERROR_LOGS || '546065895064338432'
};
