const Command = require('../Command');

module.exports = class Info extends Command {
	constructor() {
		super();

		this.name = 'info';
		this.description = 'Information about HytaleBot!';
		this.group = 'Utility';
	}

	async execute({bot, msg, say, prefix}) {
		await say({
			embed: {
				title: 'Information',
				description: `HytaleBot is a Discord bot developed by HytaleHub to provide Hytale Discord server owners with a custom Hytale-oriented Discord Bot to use to better customize their servers, as well as to get all the latest news from blog posts on Hytale.com
Run \`${prefix}socialmedia HytaleHub\` to get all of our social media!
Or run \`${prefix}socialmedia Hytale\` for the social media of Hytale itself!`
			}
		});
	}
};
