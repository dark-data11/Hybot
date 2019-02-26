const config = require('../env');
const Command = require('../Command');

module.exports = class Stats extends Command {
	constructor() {
		super();
		this.name = 'stats';
		this.description = 'Shows statistics';
		this.hidden = true;
		this.sentinel = ctx =>
			config.statisticsGuilds &&
			config.statisticsGuilds.includes(ctx.msg.guild.id);
	}

	async execute(ctx) {
		await ctx.say({
			embed: {
				title: 'Statistics',
				description: `Servers: ${ctx.client.guilds.size}
Unique users: ${ctx.client.users.size}`
			}
		});
	}
};
