const Command = require('../Command');

module.exports = class AFK extends Command {
	constructor() {
		super();

		this.name = 'afk';
		this.description = 'Marks you as AFK.';
	}

	async execute({msg, args, say, db, guildInfo, justAfk}) {
		if (justAfk) return await say('You were just AFK! Chill!');

		guildInfo.afk.push({
			id: msg.author.id,
			message: args.length > 0 ? args.join(' ') : 'No message set.'
		});

		let guild = db.collection('guild');

		await guild.updateOne(
			{guildId: msg.channel.guild.id},
			{$set: {afk: guildInfo.afk}}
		);

		await say('See you soon!');
	}
};
