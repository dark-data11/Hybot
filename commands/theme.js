const Command = require('../Command');

module.exports = class Theme extends Command {
	constructor() {
		super();

		this.name = 'theme';
		this.description = "Sets this guild's embed theme.";
		this.permissionsRequired = {
			user: ['administrator'],
			bot: []
		};
	}

	async execute({msg, args, db, say}) {
		if (args.length === 0) return await say('You must type a color code!');

		if (!/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(args[0]))
			return await say('Invalid color code!');

		let collection = db.collection('guild');

		await collection.updateOne(
			{guildId: msg.channel.guild.id},
			{$set: {theme: parseInt(args[0].replace('#', '0x'))}}
		);

		await say('Theme has been updated to `' + args[0] + '`.');
	}
};
