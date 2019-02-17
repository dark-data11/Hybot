const Command = require('../Command');

module.exports = class AFK extends Command {
	constructor() {
		super();

		this.name = 'afk';
		this.description = 'Marks you as AFK.';
		this.group = 'Universal';

		this.permissionsRequired = {
			guildOnly: true
		};
	}

	async execute({msg, args, say, db, guildInfo}) {
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
