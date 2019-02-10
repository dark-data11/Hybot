const Command = require('../Command');

module.exports = class Prefix extends Command {
    constructor() {
        super();

        this.name = 'prefix';
        this.description = 'Sets this guild\'s prefix.';
    }

    async execute({ msg, args, db }) {
        if (msg.member.permission.has('manageGuild')) {
            let requestedPrefix = args.join(' ');

            if (requestedPrefix === '') return await msg.channel.createMessage('You must type a prefix!');

            let collection = db.collection('guild');

            await collection.updateOne({ guildId: msg.channel.guild.id }, { $set: { prefix: requestedPrefix } });

            await msg.channel.createMessage('Prefix has been updated to `' + requestedPrefix + '`.');
        } else {
            await msg.channel.createMessage('You do not have the required permissions!');
        }
    }
}