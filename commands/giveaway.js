const Command = require('../Command.js');
const tackle = require('../lib/tackle');

const TADA = '🎉';

module.exports = class Giveaway extends Command {
	constructor() {
		super();
		this.name = 'giveaway';
		this.description = 'Creates a giveaway';
		this.giveawayMap = new Map();
		this.hooks = {
			// Fired when this command is loaded
			async loaded(ctx) {
				const giveawayCursor = await ctx.db.collection('giveaways').find();
				for await (const giveaway of giveawayCursor) {
					this.insertGiveaway(ctx, giveaway);
				}
			},
			async messageReactionAdd({db, client}, message, emoji, userID) {
				if (
					userID != client.user.id &&
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
	}
	insertGiveaway(ctx, giveaway) {
		this.giveawayMap.set(giveaway.id, {
			timeoutId: tackle.setLongTimeout(async () => {
				await this.pickWinners(ctx, giveaway);
				const message = await ctx.client.getMessage(
					giveaway.channelID,
					giveaway.id
				);
				message.embeds[0].color = 0xf04747;
				message.embeds[0].title += ' (ended)';
				await ctx.client.editMessage(giveaway.channelID, giveaway.id, {
					embed: message.embeds[0]
				});
				await ctx.db.collection('giveaways').deleteOne({id: giveaway.id});
				await ctx.db
					.collection('giveaway_entries')
					.deleteMany({giveawayID: giveaway.id});
				this.giveawayMap.delete(giveaway.id);
			}, giveaway.time)
		});
	}
	async pickWinners(ctx, giveaway) {
		const {client, db} = ctx;
		const winningEntries = await db.collection('giveaway_entries').aggregate([
			{$match: {giveawayID: giveaway.id}},
			{
				$sample: {size: Number(giveaway.winnerCount)}
			}
		]);
		for await (const entry of winningEntries) {
			console.log('Found a winner for giveaway...', giveaway, entry);
			try {
				const channel = await client.getDMChannel(entry.userID);
				await client.createMessage(
					channel.id,
					`Congratulations! You won the giveaway for "${giveaway.name}"!
${giveaway.prizeMessage}`
				);
			} catch (err) {
				console.warn(err);
				// They've blocked us or disabled DMs presumably... uhhh ?
				await client.createMessage(
					await client.getDMChannel(giveaway.authorID).id,
					`An error occurred while sending <@${entry.userID}> their winnings`
				);
			}
		}
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

		const message = await ctx.client.createMessage(channelID, {
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
