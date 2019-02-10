const Command = require('../Command');

module.exports = class Help extends Command {
	constructor() {
		super();

		this.name = 'help';
		this.description = 'Get help for commands!';
	}

	async execute({bot, msg, args, commands}) {
		let helpStr = '```\n';
		for (let command of Object.keys(commands)) {
			helpStr += '=';
			helpStr += commands[command].name;
			helpStr += ' - ';
			helpStr += commands[command].description;
			helpStr += '\n';
		}
		helpStr += '```';

		await msg.channel.createMessage(helpStr);
	}
};
