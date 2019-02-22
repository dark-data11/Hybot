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
					'HytaleBot is a Discord bot developed by HytaleHub. It provides utilities and Hytale-specific commands.'
			}
		});
	}
};
