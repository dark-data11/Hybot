const Command = require('../Command.js');
const Errors = require('../Errors');
const tackle = require('../lib/tackle');

const TADA = '🎉';

module.exports = class Giveaway extends Command {
	constructor() {
		super();
		this.name = 'giveaway';
		this.description = 'Creates a giveaway';
		this.group = 'Management';
		this.giveawayMap = new Map();
		this.hooks = {
			// Fired when this command is loaded
			async loaded(ctx) {
				const giveawayCursor = await ctx.db.collection('giveaways').find();
				for await (const giveaway of giveawayCursor) {
					this.insertGiveaway(ctx, giveaway);
				}
			},
			unloaded(ctx) {
				for (const giveaway of this.giveawayMap.values()) {
					console.info('Unloading giveaway...', giveaway);
					tackle.clearLongTimeout(giveaway.timeoutId);
					clearInterval(giveaway.intervalId);
				}
			},
			async messageReactionAdd({db, client}, message, emoji, userID) {
				if (
					userID != client.user.id &&
					message.author &&
					message.author.id == client.user.id &&
					emoji.name == TADA
				) {
					if (this.giveawayMap.has(message.id)) {
						console.log('Got entry to giveaway', message.id, 'by', userID);
						const id = userID + '-' + message.id;
						await db
							.collection('giveaway_entries')
							.replaceOne(
								{id},
								{userID, giveawayID: message.id, id},
								{upsert: true}
							);
					}
				}
			},
			async messageReactionRemove({db}, message, emoji, userID) {
				if (emoji.name == TADA) {
					if (this.giveawayMap.has(message.id)) {
						console.log('Removing entry to giveaway', message.id, 'by', userID);
						await db
							.collection('giveaway_entries')
							.deleteOne({id: userID + '-' + message.id});
					}
				}
			}
		};
		this.permissionsRequired = {
			guildOnly: true
		};
	}
	calculateRemaining(time) {
		const remaining = time.getTime() - new Date().getTime();
		const minutes = Math.round(remaining / 1000 / 60);
		return `${minutes} Minute${minutes == 1 ? '' : 's'}`;
	}
	insertGiveaway(ctx, giveaway) {
		const giveawayData = {
			timeoutId: tackle.setLongTimeout(async () => {
				let message = null;
				let giveawayValid = true;
				try {
					message = await ctx.client.getMessage(
						giveaway.channelID,
						giveaway.id
					);

					message.embeds[0].color = 0xf04747;
					message.embeds[0].title += ' (ended)';
					message.embeds[0].fields.pop();
				} catch (err) {
					if (err.code == Errors.UnknownMessage) {
						// They deleted the message, no giveaway for them
						giveawayValid = false;
					} else if (err.code == Errors.MissingAccess) {
						console.warn('MissingAccess while ending a giveaway, yikes');
					} else {
						// We're going to continue, otherwise we loop on this
						console.error(err);
					}
				}

				if (giveawayValid) {
					try {
						const {entrySet} = await this.pickWinners(ctx, giveaway);
						if (message !== null) {
							message.embeds[0].fields.push({
								name: 'Winners',
								value: Array.from(entrySet)
									.map(userID => `<@${userID}>`)
									.join('\n'),
								inline: false
							});
						}
					} catch (err) {
						console.error(err);
					}
				}
				if (message !== null) {
					try {
						await ctx.client.editMessage(giveaway.channelID, giveaway.id, {
							embed: message.embeds[0]
						});
					} catch (err) {
						if (err.code == Errors.UnknownMessage) {
							// Oh well
							console.warn(
								"Giveaway message was deleted while winners were being picked so we couldn't edit it"
							);
						} else if (err.code == Errors.MissingAccess) {
							console.warn(
								'We lost access to giveaway channel while winners were being picked'
							);
						} else {
							// We're going to continue, otherwise we loop on this
							console.error(err);
						}
					}
				}

				console.info('Giveaway ended, deleting entries');

				await ctx.db.collection('giveaways').deleteOne({id: giveaway.id});
				await ctx.db
					.collection('giveaway_entries')
					.deleteMany({giveawayID: giveaway.id});
				clearInterval(giveawayData.intervalId);
				this.giveawayMap.delete(giveaway.id);
			}, giveaway.time),
			intervalId: setInterval(async () => {
				try {
					// Has to be var because try{...}catch(...){...}
					var message = await ctx.client.getMessage(
						giveaway.channelID,
						giveaway.id
					);
				} catch (err) {
					if (err.code == Errors.UnknownMessage) {
						console.info('UnknownMessage while ticking timer, deleting...');
						await ctx.db.collection('giveaways').deleteOne({id: giveaway.id});
						await ctx.db
							.collection('giveaway_entries')
							.deleteMany({giveawayID: giveaway.id});
						clearInterval(giveawayData.intervalId);
						this.giveawayMap.delete(giveaway.id);
						return;
					} else if (err.code == Errors.MissingAccess) {
						// What can one do here anyways?
						console.warn(
							"MissingAccess while ticking timer, ignoring as it's non-crucial"
						);
						return;
					} else {
						throw err;
					}
				}
				const embed = message.embeds[0];
				if (new Date().getTime() >= giveaway.time.getTime()) {
					clearInterval(giveawayData.intervalId);
					// Just remove it, because it's at the end we can use pop()
					embed.fields.pop();
				} else {
					embed.fields[embed.fields.length - 1].value = this.calculateRemaining(
						giveaway.time
					);
				}

				await ctx.client.editMessage(giveaway.channelID, giveaway.id, {embed});
				// Every minute...
			}, 1000 * 60)
		};
		this.giveawayMap.set(giveaway.id, giveawayData);
	}
	async pickWinners(ctx, giveaway) {
		const {client, db} = ctx;
		const winningEntries = await db.collection('giveaway_entries').aggregate([
			{$match: {giveawayID: giveaway.id}},
			{
				$sample: {size: Number(giveaway.winnerCount)}
			}
		]);
		const entrySet = new Set();
		const entryPromises = new Set();
		for await (const entry of winningEntries) {
			entrySet.add(entry.userID);

			console.log('Found a winner for giveaway...', giveaway, entry);
			// Not awaiting so we can continue iterating
			entryPromises.add(
				client
					.getDMChannel(entry.userID)
					.then(channel =>
						tackle.say(
							ctx,
							channel.id,
							`Congratulations! You won the giveaway for "${giveaway.name}"!
${giveaway.prizeMessage}`
						)
					)
					.catch(async err => {
						console.warn(err);
						try {
							// They've blocked us or disabled DMs presumably... uhhh ?
							await tackle.say(
								ctx,
								await client.getDMChannel(giveaway.authorID).id,
								`An error occurred while sending <@${
									entry.userID
								}> their winnings`
							);
						} catch (err) {
							// Yikes.
							try {
								await tackle.say(
									ctx,
									giveaway.channelID,
									`Sorry, an error occurred while sending <@${
										entry.userID
									}> their winnings`
								);
							} catch (err) {
								console.error(err);
							}
						}
					})
			);
		}
		return {entrySet, finishedSending: Promise.all(entryPromises.values())};
	}
	async execute(ctx) {
		const title = await ctx.ask(
			'What are you going to give away? (What is the name)'
		);
		const description = await ctx.ask('Any extra rules or information?');
		const participantLimit = Number(
			await ctx.ask(
				'How many participants can enter? (Infinity for no limit)',
				msg => {
					if (isNaN(msg.content)) {
						ctx.say('Invalid number');
						return false;
					} else return true;
				}
			)
		);
		const winnerCount = Number(
			await ctx.ask('How many winners should be picked?', msg => {
				if (isNaN(msg.content)) {
					ctx.say('Invalid number');
					return false;
				} else return true;
			})
		);
		const prizeMessage = await ctx.ask(
			'What should the prize be? (You can attach a file and/or provide a message here)',
			null,
			true
		);
		// Not the most efficient but oh well...
		const timeOffset = tackle.relativeTime(
			await ctx.ask(
				"When should the prize be given? You can say something like 'in one hour' or 'June 5th'",
				msg => {
					const time = tackle.relativeTime(msg.content);
					// Make sure they can't give a date in the past!
					if (time && time > new Date().getTime()) {
						return true;
					} else {
						ctx.say(
							"Invalid date! Say something like 'in one hour' or 'June 5th'"
						);
						return false;
					}
				}
			)
		);

		const channelID = (await ctx.ask(
			'Which channel should the giveaway be sent in?',
			msg => {
				// Just in case someone tries to send cross-guild
				if (
					msg.channelMentions.length != 1 ||
					!ctx.guild.channels.get(msg.channelMentions[0])
				) {
					ctx.say("Please give the channel, (e.g. '#giveaways')");
					return false;
				}
				// Suppose there's not much else to check
				return true;
			},
			true
		)).channelMentions[0];

		const message = await tackle.say(ctx, channelID, {
			embed: {
				title: `Giveaway of ${title}`,
				description: `${description}

Click the ${TADA} below to enter!`,
				timestamp: timeOffset.toISOString(),
				author: {
					name:
						ctx.msg.member.nick ||
						ctx.msg.member.username + '#' + ctx.msg.member.discriminator,
					icon_url: ctx.msg.member.avatarURL
				},
				fields: [
					{name: 'Winner count', value: String(winnerCount), inline: true},
					{
						name: 'Participant limit',
						value: String(participantLimit),
						inline: true
					},
					{
						name: 'Remaining time',
						value: this.calculateRemaining(timeOffset),
						inline: true
					}
				]
			}
		});
		await message.addReaction(TADA);

		const giveaway = {
			id: message.id,
			channelID,
			winnerCount,
			name: title,
			prizeMessage:
				(prizeMessage.content || '') +
				(prizeMessage.attachments[0]
					? '\nAttachment: ' + prizeMessage.attachments[0].url
					: ''),
			time: timeOffset,
			authorID: message.author.id
		};
		await ctx.db.collection('giveaways').insertOne(giveaway);
		this.insertGiveaway(ctx, giveaway);
	}
};
