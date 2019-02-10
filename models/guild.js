const Sequelize = require('sequelize'), config = require('../config.json');

module.exports = (seq) => {
    return seq.define('Guild', {
        guild_id: {
            type: Sequelize.STRING,
            allowNull: false
        },
        welcomer_enabled: {
            type: Sequelize.BOOLEAN,
            defaultValue: false
        },
        welcomer_channel: {
            type: Sequelize.STRING,
            defaultValue: null
        },
        welcomer_message: {
            type: Sequelize.STRING,
            defaultValue: 'Welcome, {user}, to {server}!'
        },
        farewell_enabled: {
            type: Sequelize.BOOLEAN,
            defaultValue: false
        },
        farewell_channel: {
            type: Sequelize.STRING,
            defaultValue: null
        },
        farewell_message: {
            type: Sequelize.STRING,
            defaultValue: 'Farewell, {user}!'
        },
        theme: {
            type: Sequelize.STRING,
            defaultValue: config.theme
        },
        prefix: {
            type: Sequelize.STRING,
            defaultValue: config.prefix
        }
    });
};