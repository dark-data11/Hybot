const util = require('util');
const config = require('../config.json');
const Command = require('../Command');

module.exports = class Eval extends Command {
	constructor() {
		super();
		this.name = 'eval';
		this.description = 'Evaluates arbitrary JS';

		this.usage = '<javascript code>';

		this.hidden = true;
		this.sentinel = ctx => config.developers.includes(ctx.msg.author.id);
	}
	async execute(ctx) {
		const code = ctx.fixedContent.substring(this.name.length + 1);
		const semiIndex = code.slice(0, -1).lastIndexOf(';');
		const nlIndex = code.lastIndexOf('\n');
		const lastOpIndex = semiIndex > nlIndex ? semiIndex : nlIndex;
		const asyncWrapped = `(async () => {
${code.substring(0, lastOpIndex - 1)}
return ${code.substring(lastOpIndex + 1)}
})()`;
		console.log(asyncWrapped);
		try {
			const value = await eval(asyncWrapped);
			await this.reportValue(ctx, value);
		} catch (value) {
			await this.reportValue(ctx, value);
		}
	}
	async reportValue(ctx, value) {
		await ctx.say(`\`\`\`js
${util.inspect(value)}
\`\`\``);
	}
};
