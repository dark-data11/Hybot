const Command = require('../Command');

module.exports = class Prefix extends Command {
    constructor() {
        super();

        this.name = 'prefix';
        this.description = 'Sets this guild\'s prefix.';
    }

    async execute({ msg, args, guildInfo }) {
        if (msg.member.permission.has('manageGuild')) {
            guildInfo.prefix = args.join(' ');
            await guildInfo.save();
            await msg.channel.createMessage('Prefix has been updated to `' + guildInfo.prefix + '`.');
        } else {
            await msg.channel.createMessage('You do not have the required permissions!');
        }
    }
}