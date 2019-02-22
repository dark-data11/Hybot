const Command = require('../Command');

module.exports = class Theme extends Command {
	constructor() {
		super();

		this.name = 'theme';
		this.description = "Sets this guild's embed theme.";
		this.group = 'Management';

		this.permissionsRequired = {
			user: ['administrator'],
			guildOnly: true
		};

		this.usage = '<theme hex>';
	}

	async execute(ctx) {
		const {msg, args, db, say} = ctx;
		if (args.length === 0) return await say('You must type a color code!');

		if (!/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(args[0]))
			return await say('Invalid color code!');

		let collection = db.collection('guild');
		const colorString = args[0].substring(1);
		const colorInt = parseInt(
			// gross, but I'm not sure how to do this more elegantly
			colorString.length == 3
				? colorString
						.split('')
						.map(channel => channel.repeat(2))
						.join('')
				: colorString,
			16
		);

		await collection.updateOne(
			{guildId: msg.channel.guild.id},
			{$set: {theme: colorInt}}
		);

		ctx.guildInfo.theme = colorInt;

		await say('Theme has been updated to `' + args[0] + '`.');
	}
};
