const Command = require('../Command');

module.exports = class Info extends Command {
	constructor() {
		super();

		this.name = 'info';
		this.description = 'Information about HytaleBot!';
		this.group = 'Utility';
	}

	async execute({bot, msg, say}) {
		await say({
			embed: {
				title: 'Information',
				description:
					'HytaleBot is a Discord bot developed by HytaleHub to provide all the users with a plenty full of features for the discord server owners to use and customize/manage their server and to get news for all the latest Hytale Blog posts.'
			}
		});
	}
};
