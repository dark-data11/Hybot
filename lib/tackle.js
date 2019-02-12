const chrono = require('chrono-node');

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
