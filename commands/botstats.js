const config = require('../env');
const Command = require('../Command');

module.exports = class BotStats extends Command {
	constructor() {
		super();
		this.name = 'botstats';
		this.group = 'Utility';
		this.description = 'Shows statistics';
	}

	async execute(ctx) {
		await ctx.say({
			embed: {
				title: 'Bot Statistics',
				description: `Servers: ${ctx.client.guilds.size}
Unique users: ${ctx.client.users.size}`
			}
		});
	}
};
