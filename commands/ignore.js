const Command = require('../Command');

module.exports = class Ignore extends Command {
	constructor() {
		super();

		this.name = 'ignore';
		this.description = 'Ignore multiple roles/users/channels.';

		this.permissionsRequired = {
			user: ['administrator'],
			bot: []
		};
	}

	async execute({msg, args, db, guildInfo, say}) {
		if (args.length === 0)
			return await say(
				'Please provide any number of roles, users, or channels.'
			);

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

		if (newData.users.length > 0) {
			ignoredString += '**Users:**\n```patch\n';

			let diff = newData.users.diff(guildInfo.ignored.users);

			for (let user of newData.users) {
				ignoredString += diff.added.includes(user)
					? '+ ' + user
					: diff.removed.includes(user)
					? '- ' + user
					: user;
				ignoredString += '\n';
			}

			ignoredString += '```\n';
		}

		if (newData.roles.length > 0) {
			ignoredString += '**Roles:**\n```patch\n';

			let diff = newData.roles.diff(guildInfo.ignored.roles);

			for (let role of newData.roles) {
				ignoredString += diff.added.includes(role)
					? '+ ' + role
					: diff.removed.includes(role)
					? '- ' + role
					: role;
				ignoredString += '\n';
			}

			ignoredString += '```\n';
		}

		if (newData.channels.length > 0) {
			ignoredString += '**Channels:**\n```patch\n';

			let diff = newData.channels.diff(guildInfo.ignored.channels);

			for (let channel of newData.channels) {
				ignoredString += diff.added.includes(channel)
					? '+ ' + channel
					: diff.removed.includes(channel)
					? '- ' + channel
					: channel;
				ignoredString += '\n';
			}

			ignoredString += '```';
		}

		console.log(newData);

		await say('Ignored:\n' + ignoredString);
	}
};
