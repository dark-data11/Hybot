const Command = require('../Command');

module.exports = class Nick extends Command {
	constructor() {
		super();

		this.name = 'nick';
		this.description = 'Sets or resets a nickname of a member.';
	}

	async execute({bot, msg, args, say}) {
		if (args.length === 0) {
			await say(
				'You need to provide valid arguments! `nick <set/reset> <user mention> [nick (if setting)]`'
			);
		} else {
			let option = args.shift();
			if (option === 'set') {
				if (args.length < 2)
					return await say('You need to provide the mention and nickname!');
				let member = msg.guild.members.find(m => m.id === msg.mentions[0].id);

				if (
					member.punishable(msg.guild.members.find(m => m.id === bot.user.id))
				) {
					args.shift(); // remove mention

					await member.edit({
						nickname: args.join(' ')
					});

					await say(
						member.username +
							"'s nickname has been updated to `" +
							args.join(' ') +
							'`.'
					);
				} else {
					await say("I cannot edit that user's nickname.");
				}
			} else if (option === 'reset') {
				if (args.length < 1)
					return await say('You need to provide the mention!');
				let member = msg.guild.members.find(m => m.id === msg.mentions[0].id);

				if (
					member.punishable(msg.guild.members.find(m => m.id === bot.user.id))
				) {
					await member.edit({
						nickname: ''
					});

					await say(member.username + "'s nickname has been reset");
				} else {
					await say("I cannot edit that user's nickname.");
				}
			} else {
				await say('Invalid first argument! `nick <set/reset>`');
			}
		}
	}
};
