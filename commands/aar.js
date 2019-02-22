const Command = require('../Command');
const prettyMs = require('pretty-ms');

const chrono = require('chrono-node');

const roleRegex = /<@&(\d+)>/;

module.exports = class AAR extends Command {
	constructor() {
		super();

		this.name = 'aar';
		this.description =
			'Auto assignable roles configuration, You can add a role to be auto assigned to the user after the x amount of delay after the user joins the server.';
		this.usage = 'aar add <@role> <delay, e.g. "7 days" or "in 5 minutes">';

		this.fact =
			'This feature can be used to prevent spambots from messaging right after they join when combined with (╯°□°）╯︵ ┻━┻ mode under Server Settings -> Moderation!';
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
				var description = '';

				if (guildInfo.aar.length > 0) {
					description = 'AAR Roles:\n\n';
					for (const role of guildInfo.aar) {
						description += '<@&';
						description += role.roleId;
						description += '> - ';
						description += prettyMs(role.date, {
							keepDecimalsOnWholeSeconds: true
						});
						description += '\n';
					}
				} else {
					description = 'There are no AARs set up yet!';
				}

				await say(description);
			} else {
				await say('Usage: `aar <add/remove/list>`');
			}
		}
	}
};
