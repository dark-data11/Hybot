const Command = require('../Command');
const config = require('../config.json');

module.exports = class Help extends Command {
	constructor() {
		super();

		this.name = 'help';
		this.description = 'Get help for commands!';
		this.group = 'Universal';
	}

	async execute({bot, msg, args, commands, guildInfo, say, prefix}) {
		if (args[0]) {
			const command = args[0].toLowerCase();
			const cmd = commands[command];
			if (!cmd) {
				return await say(`Command not found! Run ${prefix}help to see a list!`);
			}
			let description = cmd.description;

			description +=
				'\n\nUsage: `' + cmd.name + ' ' + (cmd.usage ? cmd.usage : '') + '`';

			if (
				(cmd.permissionsRequired.bot &&
					cmd.permissionsRequired.bot.length > 0) ||
				(cmd.permissionsRequired.user &&
					cmd.permissionsRequired.user.length > 0)
			) {
				description += '\n\n**Required Permissions:**\n';

				if (
					cmd.permissionsRequired.bot &&
					cmd.permissionsRequired.bot.length > 0
				) {
					description +=
						'Bot: `' + cmd.permissionsRequired.bot.join('`, `') + '`\n';
				}

				if (
					cmd.permissionsRequired.user &&
					cmd.permissionsRequired.user.length > 0
				) {
					description +=
						'User: `' + cmd.permissionsRequired.user.join('`, `') + '`';
				}
			}

			return await say({
				embed: {
					title: `Help for **${prefix}${command}**`,
					description
				}
			});
		} else {
			const groups = new Map();

			for (const [command, cmd] of Object.entries(commands)) {
				const description = `${prefix}${command}`;
				const existing = groups.get(cmd.group);
				if (existing) existing.set(command, description);
				else groups.set(cmd.group, new Map([[command, description]]));
			}

			const fields = [];

			for (const [groupName, groupCommands] of groups.entries()) {
				fields.push({
					name: '__**' + groupName + '**__',
					value: Array.from(groupCommands.values())
						.map(x => '`' + x + '`')
						.join(', ')
				});
			}

			const chunked = fields.chunk(25);

			await say({
				embed: {
					title: 'Command List',
					description: `Run _\`${prefix}help <command>\`_ for more information on a specific command!`,
					fields: chunked.shift()
				}
			});

			if (chunked.length > 0) {
				for (const fieldsExtra of chunked) {
					await say({
						embed: {
							fields: fieldsExtra
						}
					});
				}
			}
		}
	}
};
