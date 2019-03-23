const fetch = require('node-fetch');
const tackle = require('../lib/tackle');
const Command = require('../Command.js');

module.exports = class Subscriptions extends Command {
	constructor() {
		super();

		this.name = 'subscriptions';
		this.description = 'Allows you to subscribe to updates to the Hytale Blog';
		this.group = 'Management';

		this.permissionsRequired = {
			user: ['administrator'],
			guildOnly: true
		};
		this.hooks = {
			loaded(ctx) {
				this.checkInterval = setInterval(
					() => this.check(ctx),
					// Production demands ip bans
					process.env.PM_ID ? 3 * 60 * 1000 : 10 * 60 * 1000
				);
				this.check(ctx);
			}
		};

		this.usage = '<add/delete>';
	}

	async publish(ctx, serviceName, post) {
		console.info('Publising new post for', serviceName, post);
		const subscriptionsCursor = await ctx.db
			.collection('subscriptions')
			.find({serviceName});

		const messagePromises = new Set();
		for await (const subscriber of subscriptionsCursor) {
			console.log('Saying...', subscriber);
			messagePromises.add(
				tackle.say(
					ctx,
					subscriber.channelID,
					{
						embed: {
							title: 'New Post',
							description: tackle.formatString(subscriber.message, post),
							thumbnail: {
								url: post.thumbnail
							}
						}
					},
					undefined,
					{
						shouldMention: subscriber.shouldMention
					}
				)
			);
		}
		await Promise.all(messagePromises);
	}

	async check(ctx) {
		console.info('Checking for subscription updates');
		const posts = await fetch(
			'https://hytale.com/api/blog/post/published?_=' + Date.now()
		).then(r => r.json());
		const postMap = new Map(posts.map(post => [post._id, post]));

		const existing = await ctx.db
			.collection('posts')
			.find({_id: {$in: Array.from(postMap.keys())}}, {_id: 1})
			.map(a => a._id)
			.toArray();

		const newPosts = [];
		for (const [postId, post] of postMap.entries()) {
			if (existing.includes(postId)) continue;
			newPosts.push(post);
		}

		if (newPosts.length) {
			await ctx.db.collection('posts').insertMany(newPosts);

			const publicationPromises = new Set();
			for (const post of newPosts) {
				const publicationDate = new Date(post.publishedAt);
				publicationPromises.add(
					this.publish(ctx, 'hytale', {
						// Gosh this is gross
						link: `https://hytale.com/news/${publicationDate.getFullYear()}/${publicationDate.getMonth() +
							1}/${post.slug}`,
						title: post.title,
						preview: post.bodyExcerpt,
						thumbnail: `https://hytale.com/m/variants/${
							post.coverImage.variants[0]
						}_${post.coverImage.s3Key}`,
						serviceName: 'hytale'
					})
				);
			}
			await Promise.all(publicationPromises);
		}
	}

	async execute(ctx) {
		const task = ctx.args[0];
		switch (task) {
			case 'delete': {
				const subscriptionsCursor = ctx.db
					.collection('subscriptions')
					.find({guildID: ctx.msg.guild.id});
				const subscriptions = [];
				const formattedSubscriptions = [];
				for await (const subscription of subscriptionsCursor) {
					const subscriptionIndex = subscriptions.push(subscription);
					formattedSubscriptions.push(
						`${subscriptionIndex}) **${subscription.serviceName}** in <#${
							subscription.channelID
						}>: ${subscription.message}`
					);
				}

				if (subscriptions.length) {
					const subscription =
						subscriptions[
							(await ctx.ask(
								`Which subscription would you like to delete?
${formattedSubscriptions.join('\n')}`,
								msg => {
									if (subscriptions[msg.content - 1] === undefined) {
										ctx.say('Invalid choice, pick a numbered choice above!');
										return false;
									}
									return true;
								}
							)) - 1
						];
					await ctx.db
						.collection('subscriptions')
						.deleteOne({_id: subscription._id});

					await ctx.say('Deleted!');
				} else {
					await ctx.say(
						`You don't have any subscriptions! Add some with \`${
							ctx.prefix
						}subscriptions add\`!`
					);
				}
				break;
			}
			case 'add': {
				// const serviceName = await ctx.ask("What service would you like to add a subscription for?");
				const serviceName = 'hytale';
				const channelID = (await ctx.ask(
					'Which channel should the subscription be sent in?',
					msg => {
						// Just in case someone tries to send cross-guild
						if (
							msg.channelMentions.length != 1 ||
							!ctx.guild.channels.get(msg.channelMentions[0])
						) {
							ctx.say("Please give the channel, (e.g. '#updates')");
							return false;
						}
						// Suppose there's not much else to check
						return true;
					},
					true
				)).channelMentions[0];

				const messageFormat = await ctx.ask(
					'What should the message look like? Send a template here, e.g. `New blog post: **{title}** Check it out at {link}!`',
					msg => {
						if (!msg.content) return false;
						try {
							tackle.formatString(msg.content, {
								link: 'https://example.org',
								title: 'Sample Post',
								preview: 'Lorem ipsum dolor',
								serviceName: 'example'
							});
						} catch (err) {
							ctx.say(
								"Something's wrong with that template: `" + err.message + '`'
							);
							return false;
						}
						return true;
					}
				);

				await ctx.db.collection('subscriptions').insertOne({
					message: messageFormat,
					channelID,
					serviceName,
					guildID: ctx.msg.guild.id,
					shouldMention: tackle.shouldMention(ctx.msg.member)
				});

				await ctx.say('Done! New posts should show in that channel!');
				break;
			}
			default: {
				await ctx.say(`To create a new subscription, run \`${
					ctx.prefix
				}subscriptions add\`
Or to delete an existing subscription, run \`${
					ctx.prefix
				}subscriptions delete\``);
			}
		}
	}
};
