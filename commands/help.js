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
		const groups = new Map();

		for (const [command, cmd] of Object.entries(commands)) {
			let description = `**${prefix}${command}**
${cmd.description}`;

			if (
				cmd.permissionsRequired.bot.length > 0 ||
				cmd.permissionsRequired.user.length > 0
			) {
				description += '\n**Required Permissions:**\n';

				if (cmd.permissionsRequired.bot.length > 0) {
					description +=
						'Bot: `' + cmd.permissionsRequired.bot.join('`, `') + '`\n';
				}

				if (cmd.permissionsRequired.user.length > 0) {
					description +=
						'User: `' + cmd.permissionsRequired.user.join('`, `') + '`';
				}
			}

			const existing = groups.get(cmd.group);
			if (existing) existing.set(command, description);
			else groups.set(cmd.group, new Map([[command, description]]));
		}

		const fields = [];

		for (const [groupName, groupCommands] of groups.entries()) {
			fields.push({
				name: String(groupName),
				value: Array.from(groupCommands.values()).join('\n\n'),
				inline: true
			});
		}

		const chunked = fields.chunk(25);

		await say({
			embed: {
				title: 'Help',
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
};
