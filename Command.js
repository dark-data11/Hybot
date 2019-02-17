module.exports = class Command {
	constructor() {
		this.name = '<unknown>';
		this.description = '<unknown>';
		this.group = '<unknown>';

		this.permissionsRequired = {
			user: [],
			bot: []
		};
	}

	async execute({msg}) {
		await msg.channel.createMessage('Broken command?');
	}

	checkPermissions(member, bot) {
		var missingPermisisons = {
			user: [],
			bot: []
		};

		for (const permission of this.permissionsRequired.user) {
			if (!member || !member.permission.has(permission))
				missingPermisisons.user.push(permission);
		}

		const botMember = member && member.guild.members.find(m => m.id === bot.id);

		for (const permission of this.permissionsRequired.bot) {
			if (!botMember || !botMember.permission.has(permission))
				missingPermisisons.bot.push(permission);
		}

		return missingPermisisons;
	}
};
