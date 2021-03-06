const Command = require('../Command');

module.exports = class Invites extends Command {
	constructor() {
		super();

		this.name = 'invites';
		this.description = 'Get your invite count. **NOT IMPLEMENTED**';
		this.permissionsRequired = {
			guildOnly: true
		};
		this.hidden = true;
		this.sentinel = () => false;
	}

	async execute({bot, msg, db}) {
		let inviteCollection = db.collection('invites');

		let userData = await inviteCollection.findOne({userId: msg.author.id});

		if (userData === null) {
			await msg.channel.createMessage('You have not invited anyone!');
		} else {
			await msg.channel.createMessage(
				`**Invited:** ${userData.invited}\n**Left:** ${
					userData.left
				}\n\n**Total:** ${userData.invited - userData.left}`
			);
		}
	}
};
