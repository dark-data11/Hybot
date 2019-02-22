const Command = require('../Command');
const prettyMs = require('pretty-ms');

const chrono = require('chrono-node');

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

		this.usage = '<add/remove/list>';
	}

	async execute({bot, msg, args, db, say, guildInfo}) {
		if (args.length < 1) {
			await say('Usage: `aar <add/remove/list>`');
		} else {
			const collection = db.collection('guild');

			const subCommand = args.shift();

			if (subCommand === 'add') {
				if (args.length < 3) {
					await say(
						'Usage: `aar add <@role> <delay, e.g. "7 days" or "in 5 minutes">`'
					);
				} else {
					const role = args.shift();

					if (!roleRegex.test(role))
						return await say("That isn't a valid role mention!");

					const roleId = role.match(roleRegex)[1];

					for (const autoRoles of guildInfo.aar) {
						if (autoRoles.roleId === roleId)
							return await say(
								'That role is already on the AAR! If you want to change the time, remove and readd it.'
							);
					}

					const date = chrono.parse(args.join(' '));

					if (!date)
						return await say('Invalid date! Try "7 days" or "in 5 minutes"!');

					date[0].ref.setMilliseconds(0);

					const dateAsNotRelative = date[0].start.date() - date[0].ref;

					guildInfo.aar.push({
						roleId,
						date: dateAsNotRelative
					});

					await collection.updateOne(
						{_id: guildInfo._id},
						{$set: {aar: guildInfo.aar}}
					);

					await say(
						'Added! Make sure the bot has a role that is higher than the role you added, or it will fail!'
					);
				}
			} else if (subCommand === 'remove') {
				if (args.length < 1) {
					await say('Usage: `aar remove <@role>`');
				} else {
					const role = args.shift();

					if (!roleRegex.test(role))
						return await say("That isn't a valid role mention!");

					const roleId = role.match(roleRegex)[1];

					var found = -1;

					for (const autoRoles in guildInfo.aar) {
						if (guildInfo.aar[autoRoles].roleId === roleId) found = autoRoles;
					}

					if (found === -1) return await say('That role is not on the AAR!');

					guildInfo.aar = guildInfo.aar.filter(r => r.roleId !== roleId);

					await collection.updateOne(
						{_id: guildInfo._id},
						{$set: {aar: guildInfo.aar}}
					);

					await say('Removed!');
				}
			} else if (subCommand === 'list') {
				var description = 'AAR Roles:\n\n';
				for (const role of guildInfo.aar) {
					description += '<@&';
					description += role.roleId;
					description += '> - ';
					description += prettyMs(role.date, {
						keepDecimalsOnWholeSeconds: true
					});
					description += '\n';
				}
				await say(description);
			} else {
				await say('Usage: `aar <add/remove/list>`');
			}
		}
	}
};
