const Eris = require('eris');
const CatLoggr = require('cat-loggr');
const MongoDB = require('mongodb');
const fs = require('fs');
const Promise = require('bluebird');
const tackle = require('./lib/tackle');
const config = require('./config.json');
const bot = new Eris(config.token);
const loggr = new CatLoggr();

require('eris-additions')(Eris); // as the name implies, it adds things to eris

const commands = {};
const hooks = {};

global.Promise = Promise;

Promise.promisifyAll(fs);
Promise.promisifyAll(require('child_process'));
Promise.promisifyAll(MongoDB);

loggr.setGlobal();

let db;
let conn;

bot.on('ready', () => {
	console.info('Hello world!');
});

(async () => {
	for (const logoLine of config.logo) console.init(logoLine);

	console.init('Connecting to MongoDB...');

	try {
		conn = await MongoDB.connectAsync(
			'mongodb://' + config.mongodb.host + ':' + config.mongodb.port,
			{useNewUrlParser: true}
		);
		db = conn.db(config.mongodb.db);
		console.info('OK');
	} catch (e) {
		console.error(e);
		return;
	}

	console.init('Loading commands...');

	const cmds = (await fs.readdirAsync('./commands')).filter(
		file =>
			!file.startsWith('#') && !file.startsWith('.#') && file.endsWith('.js')
	);
	const hookContext = {bot, db, client: bot};

	for (const file of cmds) {
		const Command = require('./commands/' + file);
		const name = file.substring(0, file.length - 3);
		const cmd = new Command();
		if (cmd.hooks) {
			hooks[name] = {};
			for (const hookName in cmd.hooks) {
				// We need to give them a context-like object, we store them on this object so that we can unload in the future
				hooks[name][hookName] = cmd.hooks[hookName].bind(cmd, hookContext);
				if (hookName == 'loaded') {
					if (bot.startTime) {
						hooks[name][hookName]();
					} else {
						bot.once('ready', hooks[name][hookName]);
					}
				} else {
					bot.on(hookName, hooks[name][hookName]);
				}
			}
		}

		commands[name] = cmd;

		console.info("Loaded command '" + name + "'");
	}

	console.init('OK');

	console.init('Connecting to Discord now.');

	bot.connect();

	bot.on('guildMemberAdd', async (guild, member) => {
		const guildInfo = await getGuildData(msg.channel.guild.id);

		// welcomer
		if (guildInfo.welcomer.enabled) {
			const formattedString = guildInfo.welcomer.message
				.replace('{user}', member.username)
				.replace('{server}', guild.name);

			try {
				await guild.channels
					.find(chan => chan.id === guildInfo.welcomer.channel)
					.createMessage(formattedString);
			} catch (e) {
				console.warn(
					'Channel in guild using welcomer does not exist. Disabling.'
				);
				await db
					.collection('guild')
					.updateOne(guildInfo, {$set: {welcomer: {enabled: false}}});
			}
		}
	});

	bot.on('messageCreate', async msg => {
		if (msg.author.bot) return;

		const guildInfo = msg.guild ? await getGuildData(msg.guild.id) : null;

		let backFromAfk = false;

		let ignored = false;

		if (guildInfo) {
			for (const afk of guildInfo.afk || []) {
				if (msg.author.id === afk.id) {
					const guild = db.collection('guild');

					await guild.updateOne(
						{guildId: msg.channel.guild.id},
						{
							$set: {
								afk: (guildInfo.afk = guildInfo.afk.filter(
									v => v.id !== msg.author.id
								))
							}
						}
					);

					backFromAfk = true;
				} else if (msg.mentions.length > 0) {
					for (const mention of msg.mentions) {
						if (mention.id === afk.id) {
							await msg.channel.createMessage(
								mention.username + ' is currently AFK: ' + afk.message
							);
						}
					}
				}
			}

			if (guildInfo.ignored) {
				if (guildInfo.ignored.users.includes(msg.author.id)) ignored = true;

				for (let role in msg.member.roles) {
					if (guildInfo.ignored.roles.includes(role.id)) ignored = true;
				}

				if (guildInfo.ignored.channels.includes(msg.channel.id)) ignored = true;
			}
		}

		const prefix = guildInfo ? guildInfo.prefix : config.prefix;

		if (msg.content.startsWith(prefix) && !ignored) {
			// developer's note: this is how to not break everything when someone sets a prefix with spaces in
			const fixedContent = msg.content.substring(prefix.length);
			const args = fixedContent.split(' ');
			const command = args.shift();

			if (commands[command] !== undefined) {
				console.info('Checking permissions for command ' + command + '.');

				if (
					!msg.guild &&
					commands[command].permissionsRequired &&
					commands[command].permissionsRequired.guildOnly
				) {
					await ctx.say(":x: That command doesn't work in DMs!");
					return;
				}

				const permissionsMissing = commands[command].checkPermissions(
					msg.member,
					bot
				);

				if (
					permissionsMissing.user.length > 0 ||
					permissionsMissing.bot.length > 0
				) {
					if (permissionsMissing.user.length > 0) {
						await msg.channel.createMessage({
							embed: {
								title: ':x: Permissions Error',
								description:
									'You are missing the following permissions:\n`' +
									permissionsMissing.user.join('`\n`') +
									'`'
							}
						});
					} else if (permissionsMissing.bot.length > 0) {
						await msg.channel.createMessage({
							embed: {
								title: ':x: Permissions Error',
								description:
									'I am missing the following permissions:\n' +
									permissionsMissing.bot.join('`\n`') +
									'`'
							}
						});
					}
					return;
				}

				console.info('Executing command ' + command + '.');
				// context object contains literally everything
				const ctx = {
					bot,
					client: bot,
					msg,
					args,
					prefix,
					fixedContent,
					commands,
					db,
					loggr,
					guildInfo,
					guild: msg.guild,
					say(content, args) {
						return tackle.say(ctx, msg.channel.id, content, args);
					},
					async ask(content, filter, wholeMessage) {
						await ctx.say(content);
						const results = await msg.channel.awaitMessages(
							// Filter is a bit more than a filter, it may also respond to the user's invalid data
							message => {
								if (message.author.id != msg.author.id) {
									console.log('Bad author');
									return false;
								}
								if (filter) {
									return filter(message);
								} else {
									return true;
								}
							},
							{
								maxMatches: 1,
								// 1 minute is plenty
								time: 60000
							}
						);
						if (!results.length) {
							throw new Error('NO_AWAIT_MESSAGES_RESPONSE');
						}
						return wholeMessage ? results[0] : results[0] && results[0].content;
					}
				};
				try {
					await commands[command].execute(ctx);
				} catch (err) {
					if (err.message == 'NO_AWAIT_MESSAGES_RESPONSE') {
						await ctx.say('The command timed out while waiting for a response');
					} else {
						console.error(err);
						await ctx.say({
							embed: {
								title: `Error occurred in ${command}!`,
								color: 0xf04747,
								description:
									'Sorry! Something went wrong while processing your command!'
							}
						});
					}
				}

				if (
					command !== 'afk' &&
					backFromAfk &&
					guildInfo &&
					guildInfo.afk_back
				) {
					await msg.channel.createMessage('By the way, welcome back!');
				}
			}
		} else if (backFromAfk && guildInfo && guildInfo.afk_back) {
			await msg.channel.createMessage('Welcome back!');
		}
	});
})();

async function getGuildData(id) {
	const guildData = db.collection('guild');

	var guildInfo = await guildData.findOne({guildId: id});

	if (guildInfo === null) {
		await guildData.insertOne(
			(guildInfo = {
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
				ignored: {
					roles: [],
					users: [],
					channels: []
				},
				theme: config.theme,
				prefix: config.prefix,
				afk: [],
				afk_back: true
			})
		);
	}

	return guildInfo;
}

process.on('unhandledRejection', function(err) {
	throw err;
});

Object.defineProperty(Array.prototype, 'chunk', {
	value(n) {
		return Array(Math.ceil(this.length / n))
			.fill()
			.map((_, i) => this.slice(i * n, i * n + n));
	}
});

Object.defineProperty(Array.prototype, 'diff', {
	value(a) {
		return {
			added: this.filter(i => !a.includes(i)),
			removed: a.filter(i => !this.includes(i))
		};
	}
});

module.exports = {client: bot, bot, db, conn, commands, hooks};
