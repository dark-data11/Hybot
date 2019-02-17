module.exports = class Command {
	constructor() {
		this.name = '<unknown>';
		this.description = '<unknown>';
		this.group = '<unknown>';

		this.permissionsRequired = {};
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
			for (const permission of this.permissionsRequired.user) {
				if (!member || !member.permission.has(permission))
					missingPermisisons.user.push(permission);
			}
		}

		if (this.permissionsRequired.bot) {
			const botMember =
				member && member.guild.members.find(m => m.id === bot.id);

			for (const permission of this.permissionsRequired.bot) {
				if (!botMember || !botMember.permission.has(permission))
					missingPermisisons.bot.push(permission);
			}
		}

		return missingPermisisons;
	}
};
