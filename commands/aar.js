const Command = require('../Command');
const tackle = require('../lib/tackle');

const roleRegex = /<@&(\d+)>/;

module.exports = class AAR extends Command {
	constructor() {
		super();

		this.name = 'aar';
		this.description =
			'Auto assignable roles configuration.\n\n*Arr, I am a pirate...*';
		this.group = 'Management';

		this.permissionsRequired = {
			bot: ['manageRoles'],
			user: ['administrator']
		};
	}

	async execute({bot, msg, args, db, ctx, guildData}) {
		if (args.length < 1) {
			await ctx.say('Usage: `aar <add/remove/list>`');
		} else {
			const collection = db.collection('guild');

			const subCommand = args.shift();

			if (subCommand === 'add') {
				if (args.length < 3) {
					await ctx.say(
						'Usage: `aar add <@role> <delay, e.g. "7 days" or "in 5 minutes">'
					);
				} else {
					const role = args.shift();

					if (!roleRegex.test(role))
						return await ctx.say("That isn't a valid role mention!");

					const roleId = role.match(roleRegex)[1];

					const date = tackle.relativeTime(args.join(' '));

					if (!date)
						return await ctx.say(
							'Invalid date! Try "7 days" or "in 5 minutes"!'
						);

					guildData.aar.push({
						roleId,
						date
					});

					await ctx.say('Added!');
				}
			} else if (subCommand === 'remove') {
			} else if (subCommand === 'list') {
				for (const role of guildData.aar) {
					// do later
				}
				await ctx.say('NOTE: do later');
			} else {
				await ctx.say('Usage: `aar <add/remove/list>`');
			}
		}
	}
};
