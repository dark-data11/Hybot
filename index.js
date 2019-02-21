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
		if (member.bot) return;

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

		guildInfo.aar.forEach(role => {
			let botMember = member.guild.members.find(m => m.id === bot.id);

			if (
				!botMember.permission.has('administrator') &&
				!botMember.permission.has('manageRoles')
			) {
				console.warn('Cannot assign roles to user, ignoring.');
				return;
			}

			tackle.setLongTimeout(async () => {
				try {
					await member.addRole(role.roleId, 'AAR');
				} catch (e) {
					console.warn('Error while assigning roles: ' + e);
				}
			}, new Date(role.date));
		});
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
					// msg.channel doesn't work for whatever reason, throws a ERR_UNESCAPED_CHARACTERS
					let dmChannel = await msg.author.getDMChannel();
					await tackle.say(
						{client: bot},
						dmChannel.id,
						":x: That command doesn't work in DMs!"
					);
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
									'`',
								color: 0xf04747
							}
						});
					} else if (permissionsMissing.bot.length > 0) {
						await msg.channel.createMessage({
							embed: {
								title: ':x: Permissions Error',
								description:
									'I am missing the following permissions:\n`' +
									permissionsMissing.bot.join('`\n`') +
									'`',
								color: 0xf04747
							}
						});
					}
					return;
				}

				const transformableArgs = args.map((argument, argumentIndex) => {
					const argumentObject = {};
					function defineTransform(key, value) {
						function transformerError() {
							const err = new Error('INVALID_COMMAND_ARGUMENTS');
							err.friendly = `${tackle.ordinal(
								argumentIndex + 1
							)} argument is required to be a \`${key}\`!`;
							return err;
						}

						argumentObject[key] = async function() {
							const result = await value.apply(
								argument,
								[{transformerError, arg: argument}].concat(arguments)
							);
							// Cache the result for later just in case
							argumentObject[key] = () => Promise.resolve(result);
							return result;
						};
					}
					defineTransform('userId', async ({transformerError, arg}) => {
						const mention = arg.match(/^<@!?([0-9]+)>$/);
						if (mention) return mention[1];
						const rawId = arg.match(/^[0-9]{17,21}$/);
						if (rawId) return rawId;

						const matchableUsers = bot.users.filter(user => {
							const tag = user.username + '#' + user.discriminator;
							return tag.toLowerCase().includes(arg.toLowerCase());
						});

						if (matchableUsers) {
							if (matchableUsers.length == 1) {
								return matchableUsers[0].id;
							} else if (matchableUsers.length == 0) {
								throw transformerError();
							} else {
								const userNumber = Number(
									await ctx.ask(
										`Multiple matching users found choose one below: \`\`\`
${matchableUsers
	.slice(0, 20)
	.map((user, i) => `${i + 1}. ${user.username}#${user.discriminator}`)
	.join('\n')}
${
	matchableUsers.length > 20
		? `[Note: Showing results 0-20 of ${matchableUsers.length}]`
		: ''
}
\`\`\``,
										msg => {
											const resulting =
												!isNaN(msg.content) && matchableUsers[msg.content - 1];
											if (!resulting) {
												ctx.say(
													`Please give a number between 1 and ${
														matchableUsers.length
													}!`
												);
											}
											return resulting;
										}
									)
								);
								return matchableUsers[userNumber - 1].id;
							}
						}
					});
					return argumentObject;
				});

				console.info('Executing command ' + command + '.');
				// context object contains literally everything
				const ctx = {
					bot,
					client: bot,
					msg,
					args,
					transmargs: transformableArgs,
					transformableArgs,
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
					} else if (err.message == 'INVALID_COMMAND_ARGUMENTS') {
						await ctx.say(err.friendly);
					} else {
						const errorCode = Math.random()
							.toString(36)
							.substring(2, 8);
						console.error(err);
						await ctx.say({
							embed: {
								title: `Error occurred in ${command}!`,
								color: 0xf04747,
								description:
									'Sorry! Something went wrong while processing your command!\n\nError Code: `' +
									errorCode +
									'`'
							}
						});
						await logError(
							err,
							errorCode,
							msg.author,
							fixedContent,
							msg.guild,
							false
						);
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
				aar: [],
				theme: config.theme,
				prefix: config.prefix,
				afk: [],
				afk_back: true
			})
		);
	}

	return guildInfo;
}

process.on('unhandledRejection', async function(err) {
	console.error(err);
	await logError(err, '000000', null, null, null, true);
	process.exit(1);
});

async function logError(err, code, user, command, guild, fatal) {
	console.error('Logging error with #errors channel.');
	try {
		await bot.createMessage(config.errorLogs, {
			embed: {
				title: (fatal ? 'Fatal ' : '') + 'Error - ' + code,
				description: '```\n' + err.stack + '\n```',
				color: 0xf04747,
				fields: !fatal
					? [
							{
								name: 'User',
								value: user.username + '#' + user.discriminator
							},
							{
								name: 'Guild',
								value: guild ? guild.name : 'Unknown - probably DM'
							},
							{
								name: 'Raw Command',
								value: command
							}
					  ]
					: null
			}
		});
		console.error('Done.');
	} catch (e) {
		console.error(e);
	}
}
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
