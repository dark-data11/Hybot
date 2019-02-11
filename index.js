const Eris = require('eris'), CatLoggr = require('cat-loggr'), MongoDB = require('mongodb'), fs = require('fs'), Promise = require('bluebird'),
    config = require('./config.json'), bot = new Eris(config.token), loggr = new CatLoggr();

require('eris-additions')(Eris); // as the name implies, it adds things to eris

var commands = {};

global.Promise = Promise;

Promise.promisifyAll(fs);
Promise.promisifyAll(MongoDB);

loggr.setGlobal();

var db;
var conn;

bot.on('ready', () => {
    console.info('Hello world!');
});

(async () => {
    for (let logoLine of config.logo)
        console.init(logoLine);

    console.init('Connecting to MongoDB...');

    try {
        conn = await MongoDB.connectAsync('mongodb://' + config.mongodb.host + ':' + config.mongodb.port, { useNewUrlParser: true });
        db = conn.db(config.mongodb.db);
        console.init('OK');
    } catch (e) {
        console.error(e);
        return;
    }

    console.init('Loading commands...');

    let cmds = await fs.readdirAsync('./commands');

    for (let file of cmds) {
        let Command = require('./commands/' + file);
        let name = file.substring(0, file.length - 3);
        let cmd = new Command();

        commands[name] = cmd;

        console.info('Loaded command \'' + name + '\'');
    }

    console.init('OK');

    console.init('Connecting to Discord now.');

    bot.connect();

    bot.on('guildMemberAdd', async (guild, member) => {
        let guildInfo = await getGuildData(msg.channel.guild.id);

        // welcomer
        if (guildInfo.welcomer.enabled) {
            let formattedString = guildInfo.welcomer.message.replace('{user}', member.username).replace('{server}', guild.name);
            
            try {
                await guild.channels.find(chan => chan.id === guildInfo.welcomer.channel).createMessage(formattedString);
            } catch(e) {
                console.warn('Channel in guild using welcomer does not exist. Disabling.');
                await db.collection('guild').updateOne(guildInfo, { $set: { welcomer: { enabled: false } } });
            }
        }
    });

    bot.on('messageCreate', async msg => {
        if (msg.author.bot) return;

        let guildInfo = await getGuildData(msg.channel.guild.id);

        if (msg.content.startsWith(guildInfo.prefix)) {
            // developer's note: this is how to not break everything when someone sets a prefix with spaces in
            let fixedContent = msg.content.substring(guildInfo.prefix.length);
            let args = fixedContent.split(' ');
            let command = args[0];

            args.shift();

            if (commands[command] !== undefined) {
                console.info('Executing command ' + command + '.');
                // context object contains literally everything
                await commands[command].execute({
                    bot,
                    msg,
                    args,
                    commands,
                    db,
                    loggr,
                    guildInfo
                });
            }
        }
    });
})();

async function getGuildData(id) {
    let guildData = db.collection('guild');

    let guildInfo = await guildData.findOne({ guildId: msg.channel.guild.id });

    if (guildInfo === null) {
        await guildData.insertOne(guildInfo = {
            guildId: id,
            welcomer: {
                enabled: false,
                channel: null,
                message: 'Welcome, {user}, to {server}!'
            },
            farewell: {
                enabled: false,
                channel: null,
                message: 'Farewell, {user}.'
            },
            theme: config.theme,
            prefix: config.prefix
        });
    }

    return guildInfo;
}