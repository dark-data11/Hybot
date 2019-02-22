const Command = require('../Command');
const Discord = require('eris');

class SocialMedia extends Command {
	constructor() {
		super();
		this.name = 'socialmedia';
		this.description = 'Shows social media platforms for people';
		this.group = 'Utility';

		this.specialSocials = {
			hytale: [
				{
					url: 'https://twitter.com/hytale',
					site: 'Twitter',
					name: 'hytale'
				},
				{
					url: 'https://youtube.com/hytale',
					site: 'YouTube',
					name: 'hytale'
				},
				{
					url: 'https://hytale.com/',
					site: 'Website',
					name: 'hytale.com'
				}
			],
			hytalehub: [
				{
					url: 'https://hytalehub.com',
					site: 'Website',
					name: 'hytalehub.com'
				},
				{
					url: 'https://twitter.com/hytale_hub',
					site: 'Twitter',
					name: 'hytale_hub'
				},
				{
					url: 'https://youtube.com/hytalehub',
					site: 'YouTube',
					name: 'hytalehub'
				},
				{
					url: 'https://www.reddit.com/r/HytaleForum',
					site: 'Subreddit',
					name: 'HytaleForum'
				},
				{
					url: 'https://facebook.com/groups/hytalehub',
					site: 'Facebook Group',
					name: 'hytalehub'
				},
				{
					url: 'https://facebook.com/hytalehub',
					site: 'Facebook',
					name: 'hytalehub'
				}
			]
		};
		this.specialUsers = {
			hytale: {
				username: 'Hytale',
				discriminator: null,
				avatarURL: 'https://hytale.com/static/images/logo-h.png'
			},
			hytalehub: {
				username: 'Hytalehub',
				discriminator: null,
				// Yikes.
				avatarURL:
					'https://media.discordapp.net/attachments/485428830060675120/531543164637675532/Webp.net-resizeimage_412.png'
			}
		};

		this.usage = '[username] OR <create/delete>';
	}

	async execute(ctx) {
		let userId;
		if (ctx.args[0]) {
			if (ctx.args[0].toLowerCase() == 'create') {
				const socialKey = await ctx.ask('What is the name of the site?');
				const socialName = await ctx.ask(
					"What's your username/handle on the site?"
				);
				const socialLink = await ctx.ask(
					'Give a link to your profile on the site!'
				);

				await ctx.db.collection('socials').insertOne({
					userId: ctx.msg.author.id,
					name: socialName,
					site: socialKey,
					url: socialLink
				});
				await ctx.say(
					`Saved! Run \`${ctx.prefix}socialmedia ${
						ctx.msg.author.username
					}\` to see your changes!`
				);
				return;
			} else if (ctx.args[0].toLowerCase() == 'delete') {
				const socialsCursor = await ctx.db
					.collection('socials')
					.find({userId: ctx.msg.author.id});
				const socials = await socialsCursor.toArray();
				let socialIndex;
				if (socials.length == 0) {
					return await ctx.say("You don't have any accounts linked to you!");
				} else if (socials.length > 1) {
					socialIndex =
						Number(
							await ctx.ask(
								`Which would you like to delete? \`\`\`
${socials.map((social, i) => `${i + 1}. ${social.site} (${social.name})`)}
\`\`\``,
								msg => {
									if (!isNaN(msg.content) && socials[msg.content - 1]) {
										return true;
									} else {
										ctx.say(
											`Please pick a number between 1 and ${socials.length}`
										);
										return false;
									}
								}
							)
						) - 1;
				} else {
					socialIndex = 0;
				}
				await ctx.db
					.collection('socials')
					.removeOne({_id: socials[socialIndex]._id});
				await ctx.say('Removed!');
				return;
			} else if (this.specialUsers[ctx.args[0].toLowerCase()]) {
				// Gross but ok
				userId = ctx.args[0].toLowerCase();
			} else {
				userId = await ctx.transmargs[0].userId();
			}
		} else {
			userId = ctx.msg.author.id;
		}
		const socials =
			this.specialSocials[userId] ||
			(await ctx.db.collection('socials').find({
				userId
			}));

		const socialFields = [];
		for await (const social of socials) {
			const at = social.site.toLowerCase().includes('subreddit')
				? '/r/'
				: social.site.toLowerCase().includes('site') ? '' : '@';
			socialFields.push({
				name: social.site,
				value: `[${at}${social.name}](${social.url})`,
				inline: true
			});
		}

		const user =
			this.specialUsers[userId] ||
			ctx.client.users.get(userId) ||
			(await ctx.client.requestHandler
				.request('GET', Discord.Endpoints.USER(userID), true)
				.then(user => {
					const properUser = new Discord.User(user, this);
					return thsi.users.set(user.id, properUser);
					return properUser;
				})).catch(err => null);
		if (!user) {
			return await ctx.say("The user provided doesn't exist!");
		}
		const tag = user.discriminator
			? `${user.username}#${user.discriminator}`
			: user.username;

		await ctx.say({
			embed: {
				thumbnail: {
					url: user.avatarURL
				},
				title: `User profile for ${tag}`,

				fields: socialFields
			}
		});
	}
}

module.exports = SocialMedia;
