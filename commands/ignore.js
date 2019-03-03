const Command = require('../Command');

module.exports = class Ignore extends Command {
	constructor() {
		super();

		this.name = 'ignore';
		this.description = 'Make the bot ignore multiple roles/users/channels.';
		this.group = 'Management';

		this.permissionsRequired = {
			user: ['administrator'],
			guildOnly: true
		};

		this.usage = '<roles/users/channels>';
	}

	async execute({msg, args, db, guildInfo, say}) {
		if (args.length === 0)
			return await say('Usage: `ignore <roles/users/channels>`');

		let oldData = JSON.parse(JSON.stringify(guildInfo.ignored));
		let newData = JSON.parse(JSON.stringify(guildInfo.ignored)); // have to do this to prevent guildInfo from getting updated

		for (let userMention of msg.mentions) {
			if (!newData.users.includes(userMention.id))
				newData.users.push(userMention.id);
		}

		for (let roleMention of msg.roleMentions) {
			if (!newData.roles.includes(roleMention)) newData.roles.push(roleMention);
		}

		for (let channelMention of msg.channelMentions) {
			if (!newData.channels.includes(channelMention))
				newData.channels.push(channelMention);
		}

		let collection = db.collection('guild');

		await collection.updateOne(
			{guildId: msg.channel.guild.id},
			{$set: {ignored: newData}}
		);

		let ignoredString = '';

		// this may seem inefficient but newData also contains the old data.

		const combinedUsers = new Set(newData.users.concat(oldData.users));

		if (combinedUsers.size !== 0) {
			ignoredString += '**Users:**\n';

			const diff = newData.users.diff(oldData.users);

			for (const user of combinedUsers) {
				ignoredString += diff.added.includes(user)
					? ':new:  <@' + user + '>'
					: diff.removed.includes(user)
						? '~~<@' + user + '>~~'
						: '<@' + user + '>';
				ignoredString += '\n';
			}

			ignoredString += '\n';
		}

		const combinedRoles = new Set(newData.roles.concat(oldData.roles));

		if (combinedRoles.size !== 0) {
			ignoredString += '**Roles:**\n';

			const diff = newData.roles.diff(oldData.roles);

			for (const role of combinedRoles) {
				ignoredString += diff.added.includes(role)
					? ':new:  <@&' + role + '>'
					: diff.removed.includes(role)
						? '~~<@&' + role + '>~~'
						: '<@&' + role + '>';
				ignoredString += '\n';
			}

			ignoredString += '\n';
		}

		const combinedChannels = new Set(newData.channels.concat(oldData.channels));

		if (combinedChannels.size !== 0) {
			ignoredString += '**Channels:**\n';

			const diff = newData.channels.diff(oldData.channels);

			for (const channel of combinedChannels) {
				ignoredString += diff.added.includes(channel)
					? ':new:  <#' + channel + '>'
					: diff.removed.includes(channel)
						? '~~<#' + channel + '>~~'
						: '<#' + channel + '>';
				ignoredString += '\n';
			}
		}

		console.log(newData);

		await say('Ignored:\n' + ignoredString);
	}
};
