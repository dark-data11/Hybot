module.exports = class Command {
	constructor() {
		this.name = '<unknown>';
		this.description = '<unknown>';
	}

	async execute({msg}) {
		await msg.channel.createMessage('Broken command?');
	}
};
