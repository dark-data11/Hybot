module.exports = class Command {
	constructor() {
		this.name = '<unknown>';
		this.description = '<unknown>';
		this.group = '<unknown>';

		this.permissionsRequired = {};

		this.usage = null;
	}

	async execute({msg}) {
		await msg.channel.createMessage('Broken command?');
	}

	checkPermissions(member, bot) {
		var missingPermisisons = {
			user: [],
			bot: []
		};

		if (this.permissionsRequired.user) {
			if (!member.permission.has('administrator')) {
				for (const permission of this.permissionsRequired.user) {
					if (!member || !member.permission.has(permission))
						missingPermisisons.user.push(permission);
				}
			}
		}

		if (this.permissionsRequired.bot) {
			const botMember = member && member.guild.members.get(bot.user.id);

			if (botMember && !botMember.permission.has('administrator')) {
				for (const permission of this.permissionsRequired.bot) {
					if (!botMember.permission.has(permission))
						missingPermisisons.bot.push(permission);
				}
			}
		}

		return missingPermisisons;
	}
};
