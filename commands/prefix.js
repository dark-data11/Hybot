const Command = require('../Command');

module.exports = class Prefix extends Command {
	constructor() {
		super();

		this.name = 'prefix';
		this.description = "Sets this guild's prefix.";
		this.group = 'Management';

		this.permissionsRequired = {
			user: ['administrator'],
			guildOnly: true
		};

		this.usage = '<prefix>';
	}

	async execute({msg, args, db, say}) {
		let requestedPrefix = args.join(' ');

		if (requestedPrefix === '') return await say('You must type a prefix!');

		let collection = db.collection('guild');

		await collection.updateOne(
			{guildId: msg.channel.guild.id},
			{$set: {prefix: requestedPrefix}}
		);

		await say('Prefix has been updated to `' + requestedPrefix + '`.');
	}
};
