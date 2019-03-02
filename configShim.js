const config = require('./config.json');

process.env.TOKEN = config.token;
process.env.LOGO = config.logo.join('\n');
process.env.MONGO_HOST = config.mongodb.host;
process.env.MONGO_PORT = config.mongodb.port;
process.env.MONGO_DB = config.mongodb.db;
process.env.THEME = config.theme;
process.env.PREFIX = config.prefix;
process.env.ERROR_LOGS = config.errorLogs;

require('./index');
