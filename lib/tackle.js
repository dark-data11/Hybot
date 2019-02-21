const chrono = require('chrono-node');
const messageFormat = require('intl-messageformat');

module.exports.relativeTime = function(time) {
	const parsed = chrono.parseDate(time, new Date(), {forwardDate: true});
	if (!parsed) return null;
	return parsed;
};

// Messy, but it's needed because js has a number limit for setTimeout()

let lastId = 0;
module.exports.setLongTimeout = function(hook, endTime, ...extraArgs) {
	const timeoutId = lastId++;
	timeoutTick(hook, endTime, timeoutId, extraArgs);
};
module.exports.clearLongTimeout = function(timeoutId) {
	const realTimeoutId = timeoutMap.get(timeoutId);
	if (!realTimeoutId) throw new Error('Timeout not found with id ' + timeoutId);
	clearTimeout(realTimeoutId);
	timeoutMap.delete(timeoutId);
};

function finishTimeout(hook, timeoutId, endTime, extraArgs) {
	timeoutMap.delete(timeoutId);
	if (extraArgs) hook(...extraArgs);
	else hook();
}

const timeoutMap = new Map();

const timeoutMax = 2147483647;
function timeoutTick(hook, endTime, timeoutId, extraArgs) {
	const remainingTime = endTime - new Date().getTime();
	console.debug(`Ticked timeout ${timeoutId}, ${remainingTime} left`);
	if (remainingTime > timeoutMax)
		setTimeout(timeoutTick, timeoutMax, hook, timeoutId, endTime, extraArgs);
	else
		setTimeout(
			finishTimeout,
			remainingTime,
			hook,
			timeoutId,
			endTime,
			extraArgs
		);
}

function say(ctx, channelId, content, args) {
	if (typeof content == 'string') {
		return say(
			ctx,
			channelId,
			{
				embed: {
					description: content
				}
			},
			args
		);
	} else {
		if (ctx.guildInfo) {
			if (content.embed && !content.embed.color)
				content.embed.color = isNaN(ctx.guildInfo.theme)
					? null
					: ctx.guildInfo.theme;
		}
		if (content.embed && !content.embed.footer) {
			content.embed.footer = {
				text: 'Developed by HytaleHub.com',
				icon_url: ctx.client.user.dynamicAvatarURL('png', 128)
			};
		}

		return ctx.client.createMessage(channelId, content, args);
	}
}

module.exports.say = say;

module.exports.formatString = function(format, formatContext) {
	const message = new messageFormat(format, ['en-US']);
	return message.format(formatContext || {});
};

module.exports.ordinal = function(number) {
	const str = String(number);

	if (str.endsWith('1')) return str + 'st';
	if (str.endsWith('2')) return str + 'nd';
	if (str.endsWith('3')) return str + 'rd';
	else return str + 'th';
};
