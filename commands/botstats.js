const config = require('../env');
const fetch = require('node-fetch');
const Command = require('../Command');

module.exports = class BotStats extends Command {
	constructor() {
		super();
		this.name = 'botstats';
		this.group = 'Utility';
		this.description = 'Shows statistics';
		// I want to avoid putting everything in index sooo
		this.hooks = {
			guildCreate: update,
			guidDelete: update,
			loaded: update
		};
		async function update(ctx) {
			if (config.dblToken) {
				const guildCount = ctx.client.guilds.size;

				console.info('Going to update statistics now');

				const response = await fetch(
					`https://discordbots.org/api/bots/${ctx.client.user.id}/stats`,
					{
						method: 'POST',
						headers: {
							Authorization: config.dblToken
						},
						body: JSON.stringify({server_count: guildCount}),
						redirect: 'follow'
					}
				);
				if (response.status >= 200 && response.status <= 299) {
					const body = await response.json();
					console.info(
						`Updated statistics, we're now in ${guildCount} guilds`,
						body
					);
				} else {
					const body = await response.text();
					console.warn(
						`Bad response code from posting to DBL... ${response.status}!`,
						body
					);
				}
			} else {
				console.log(
					'Was going to update DBL stats, but no DBL token configured'
				);
			}
		}
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
