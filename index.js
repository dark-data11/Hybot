const Eris = require('eris'), CatLoggr = require('cat-loggr'), Sequelize = require('sequelize'), fs = require('fs'), Promise = require('bluebird'),
    config = require('./config.json'), bot = new Eris(config.token), loggr = new CatLoggr();

var commands = {}, models = {};

global.Promise = Promise;

Promise.promisifyAll(fs);

loggr.setGlobal();

const db = new Sequelize('hybot', null, null, {
    dialect: 'sqlite',
    storage: './hybot.sqlite'
});

bot.on('ready', () => {
    console.info('Hello world!');
});

(async () => {
    for (let logoLine of config.logo)
        console.init(logoLine);

    console.init('Testing SQLite connection...');

    try {
        await db.authenticate();
        console.init('OK');
    } catch (e) {
        console.error(e);
    }

    console.init('Defining models and modifying tables if needed...');

    let models = await fs.readdirAsync('./models');

    for (let file of models) {
        let model = require('./models/' + file);
        let name = file.substring(0, file.length - 3);

        models[name] = model(db);

        console.init('Defined model \'' + name + '\'');
    }

    console.init('Synchronising...');

    await db.sync();

    console.init('OK');

    console.init('Loading commands...');

    let cmds = await fs.readdirAsync('./commands');

    for (let file of cmds) {
        let Command = require('./commands/' + file);
        let name = file.substring(0, file.length - 3);
        let cmd = new Command();

        commands[name] = cmd;

        console.init('Loaded command \'' + name + '\'');
    }

    console.init('OK');

    console.init('Connecting to Discord now.');

    bot.connect();

    bot.on('messageCreate', async msg => {
        if (msg.author.bot) return;

        let guildInfo = (await models.guild.findOrCreate({ where: { guild_id: msg.channel.guild.id } }))[0]; // first element is actually the data

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