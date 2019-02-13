const prettier = 'prettier --write';
const paths = ['lib/**.js', '*.js', '*.json', 'commands/**.js'].join(' ');

module.exports = {
	hooks: {
		'pre-commit':
			process.platform == 'win32'
				? `${prettier} ${paths} && git add ${paths}`
				: '${prettier} ${paths} && git add $(git diff --staged --name-only)'
	}
};
