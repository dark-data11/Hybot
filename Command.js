module.exports = class Command {
    constructor() {
        this.name = '<unknown>';
        this.description = '<unknown>';
    }

    async execute({ bot, msg, args, commands }) {
        await msg.channel.createMessage('Broken command?');
    }
}