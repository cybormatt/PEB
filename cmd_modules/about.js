const CONFIG = require("../config.json");
const utils = require("../lib/utils.js");
const logger = require("../lib/logger.js");

var client;

module.exports = {
  name: "about",
  init() {
    client = this.client
  },
  execute(interaction) {
    var memberCount = 0;
    
    for (let g of client.guilds.cache.values()) {
      memberCount += g.memberCount;
    }

    const embed = {
      title: 'Psychic Experiment Bot',
      description: 'Psychic Experiment Bot is an innovative tool designed to facilitate controlled experiments between a subject and a psychic. The psychic\'s task is to intuitively guess the selections made by the subject. The tool tracks each interaction, logging the subject’s choices, the number of attempts made by the psychic, and the final accuracy score. This allows both parties to measure and analyze progress over time.\n\nWith its precise data logging, Psychic Experiment Bot provides a structured environment for testing psychic abilities, offering insights into performance patterns and potential improvements over successive trials.',
      color: 0x2ecc71,  // Greenish color,
      author: {
        name: CONFIG.Author.Name,
        url: CONFIG.Author.URL,
        icon_url: CONFIG.ServerName + CONFIG.Author.Icon
      },
      thumbnail: { url: CONFIG.ServerName + '/images/peb.png' },
      fields: [
        {
          name: "Command Prefix",
          value: CONFIG.Prefix,
          inline: true
        },
        {
          name: "Members",
          value: memberCount.toString(),
          inline: true
        },
        {
          name: "Channels",
          value: client.channels.cache.size.toString(),
          inline: true
        },
        {
          name: "Servers",
          value: client.guilds.cache.size.toString(),
          inline: true
        },
        {
          name: "Created",
          value: utils.formatDate(client.user.createdAt),
          inline: true
        },
        {
          name: "Uptime",
          value: utils.formatTimestamp(client.uptime),
          inline: true
        }
      ],
      timestamp: new Date(),
      footer: { text: 'Test your psychic abilities today!' }
    }
    // Respond to the interaction with the embed
    interaction.reply({ embeds: [embed] });
  }
}