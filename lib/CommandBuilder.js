const { SlashCommandBuilder } = require("@discordjs/builders");
const { Collection } = require("@discordjs/collection");
const { Message } = require('discord.js');
const utils = require("./utils.js");

class CommandBuilder extends SlashCommandBuilder {
    static BOT_ADMIN_COMMAND = 1;
    static MESSAGE_COMMAND = 2;
    static INTERNAL_COMMAND = 4;
    static SLASH_COMMAND = 8;
    static WEB_COMMAND = 16;

    category = "";
    enabled = true;
    deleteUserMessage = false;
    isGlobal = false;
    commandType = 0;
    syntax = [];
    permissions = new Collection();

    map() {
        return {
            name: this.name,
            description: this.description,
            options: this.options,
            category: this.category,
            deleUserMessage: this.deleteUserMessage,
            commandType: this.commandType,
            syntax: this.syntax,
            isGlobal: this.isGlobal
        }
    }

    setCategory(val) {
        this.category = val;
        return this;
    }

    setEnabled(val) {
        this.enabled = val;
        return this;
    }

    setGlobal(val) {
        this.isGlobal = val;
        return this;
    }

    setSyntax(str) {
        this.syntax.push(str);
        return this;
    }

    setCommandType(commandType) {
        this.commandType = this.commandType | commandType;
        return this;
    }

    setDeleteUserMessage(val) {
        this.deleteUserMessage = val;
        return this;
    }

    isSlashCommand() {
        return (this.commandType & this.constructor.SLASH_COMMAND) == this.constructor.SLASH_COMMAND;
    }

    isMessageCommand() {
        return (this.commandType & this.constructor.MESSAGE_COMMAND) == this.constructor.MESSAGE_COMMAND;
    }

    isInternalCommand() {
        return (this.commandType & this.constructor.INTERNAL_COMMAND) == this.constructor.INTERNAL_COMMAND;
    }

    isBotAdminCommand() {
        return (this.commandType & this.constructor.BOT_ADMIN_COMMAND) == this.constructor.BOT_ADMIN_COMMAND;
    }

    isWebCommand() {
        return (this.commandType & this.constructor.WEB_COMMAND) == this.constructor.WEB_COMMAND;
    }
}

class CommandOption {
    __opt;
    __client;
    __guild;

    name;
    type;
    __value;
    get value() {
        return this.__value;
    }

    options;

    user;
    member;
    channel;
    role;

    async setValue(value) {
        if (this.type == undefined && this.__opt.options) {
            this.__value = value;
            this.options = this.__opt.options;
            return;
        }

        switch (this.type) {
            case CommandOptionType.Subcommand:
            case CommandOptionType.SubcommandGroup:
                break;
            case CommandOptionType.String:
                this.__value = value;
                break;
            case CommandOptionType.Integer:
            case CommandOptionType.Number:
                var val;

                if (this.type == CommandOptionType.Integer) val = parseInt(value);
                else val = parseFloat(value);

                if (isNaN(val)) throw new Error(`Value given for option ${this.name} is not a number!`);
                else this.__value = val;

                break;
            case CommandOptionType.Boolean:
                var bool = utils.parseBoolean(value);
                if (bool == undefined) throw new Error(`Invalid boolean value given for option ${this.name}!`);
                this.__value = bool;
                break;
            case CommandOptionType.User:
                await this.__processUser(value);
                break;
            case CommandOptionType.Channel:
                await this.__processChannel(value);
                break;
            case CommandOptionType.Role:
                await this.__processRole(value);
                break;
            case CommandOptionType.Mentionable:
                await this.__processMentionable(value);
                break;
            default:
                throw new Error("Unknown option type!");
        }
    }

    async __processUser(value) {
        var match = value.match(/(<@(!|&)?)?([0-9]{18})($|>$)/);
        if (match) {
            var id = match[3];
            this.__value = id;

            if (this.__guild) {
                var member;
                try {
                    member = await this.__guild.members.fetch({ user: id, force: true });

                    if (member) {
                        this.member = member;
                    }
                }
                catch (err) {
                    if (!err.message.match(/Unknown (Member|User)/i)) {
                        throw err;
                    }
                }
            }

            var user;
            try {
                user = await this.__client.users.fetch(id, { force: true });
                this.user = user;
            }
            catch (err) {
                if (err.message.match(/Unknown User/i)) {
                    throw new Error(`Could not find user with id ${id} for option ${this.name}!`);
                }
                else throw err;
            }
        }
        else throw new Error(`Invalid user input for option ${this.name}!`);
    }

    async __processChannel(value) {
        var match = value.match(/(<#)?([0-9]{18})($|>$)/);
        if (match) {
            var id = match[2];
            var channel = await this.__guild.channels.fetch(id);

            if (channel) {
                this.__value = id;
                this.channel = channel;
            }
            else {
                throw new Error(`Could not find channel with id ${id} for option ${this.name}!`);
            }
        }
        else {
            var tmp = ((value[0] == "#") ? value.slice(1) : value).toLowerCase();
            var channel;

            await this.__guild.channels.fetch();
            for (let c of this.__guild.channels.cache.values()) {
                if (c.type != "GUILD_VOICE" && c.type != "GUILD_STAGE_VOICE") continue;
                if (c.name.toLowerCase() == tmp) {
                    channel = c;
                    break;
                }
            }

            if (!channel) throw new Error(`Invalid channel input for option ${this.name}!`);

            this.__value = channel.id;
            this.channel = channel;
        }
    }

    async __processRole(value) {
        var match = value.match(/(<@&)?([0-9]{18})($|>$)/);
        if (match) {
            var id = match[2];
            var role = await this.__guild.roles.fetch(id);

            if (role) {
                this.__value = id;
                this.role = role;
            }
            else {
                throw new Error(`Could not find role with id ${id} for option ${this.name}`);
            }
        }
        else throw new Error(`Invalid role input for option ${this.name}`);
    }

    async __processMentionable(value) {
        var match = value.match(/(<@(!|&)?)?([0-9]{18})($|>$)/);
        if (match) {
            var role = await this.__guild.roles.fetch(id);
            if (role) {
                this.__value = id;
                this.role = role;
            }
            else {
                var member = await this.__guild.members.fetch(id);
                if (member) {
                    this.__value = id;
                    this.user = member.user;
                    this.member = member;
                }
                else {
                    var user = await this.__client.users.fetch(id);
                    if (!user) throw new Error(`Could not find user or role with id ${id} for option ${this.name}!`);

                    this.__value = id;
                    this.user = user;
                }
            }
        }
        else throw new Error(`Invalid mentionable input for option ${this.name}!`);
    }

    constructor(client, guild, commandOption) {
        this.__client = client;
        this.__guild = guild;
        this.__opt = commandOption;
        this.name = commandOption.name;
        this.type = commandOption.type;
    }
}

class CommandOptionResolver {
    client;
    guild;

    command;
    subcommand;
    __origArgs;
    __remainingArgs;
    args;

    initialized = false;

    getSubcommand() {
        if (!this.initialized) throw new Error("Object not initialized!");
        return this.subcommand?.name;
    }

    get(name) {
        if (!this.initialized) throw new Error("Object not initialized!");
        return this.args.find(a => a.name == name);
    }

    getString(name) {
        return this.get(name)?.value;
    }

    getInteger(name) {
        return this.get(name)?.value;
    }

    getNumber(name) {
        return this.get(name)?.value;
    }

    getBoolean(name) {
        return this.get(name)?.value;
    }

    getUser(name) {
        return this.get(name)?.user;
    }

    getMember(name) {
        return this.get(name)?.member;
    }

    getRole(name) {
        return this.get(name)?.role;
    }

    getChannel(name) {
        return this.get(name)?.channel;
    }

    getMentionable(name) {
        var tmp;
        if (tmp = this.get(name)?.role) return tmp;
        else if (tmp = this.get(name)?.member) return tmp;
        else if (tmp = this.get(name)?.user) return tmp;
        else return;
    }

    async initialize() {
        var match = this.__matchArgs();
        var opts;
        /* HACK: For some reason, the sub-command option objects have an undefined type.
           So we determine it is a sub-command option by checking if the options property is
           not null. We will also check the type properly for future updates to API */
        if (this.command.options.find(o => (o.type == undefined && o.options) || o.type == CommandOptionType.Subcommand)) {
            if (!match) throw new Error(`You must provide a sub-command for this command!`)

            for (let o of this.command.options) {
                if (!((o.type == undefined && o.options) || o.type == CommandOptionType.Subcommand)) continue;

                var val = (match[4] ? ((match[3] != "/") ? match[4] : match[2]) : match[2]).toLowerCase();
                if (o.name.toLowerCase() == val) {
                    var arg = new CommandOption(this.client, this.guild, o);
                    await arg.setValue(val);

                    this.subcommand = arg;
                    this.__shift(match[0]);
                }
            }

            if (!this.subcommand) throw new Error(`Sub-command ${val} not found!`);

            opts = this.subcommand.options;
        }
        else {
            opts = this.command.options;
        }

        while (match = this.__matchArgs()) {
            var commandOption;
            var name = (match[1]) ? match[1].slice(0, match[1].indexOf("=")) : "";
            var val = match[4] ? ((match[3] != "/") ? match[4] : match[2]) : match[2];

            if (name) {
                for (let o of opts) {
                    var tmp = name.toLowerCase();
                    if (o.name.toLowerCase() == tmp) {
                        commandOption = o;
                        break;
                    }
                }

                if (!commandOption) throw new Error(`Can not find option with name ${name}!`);
            }
            else {
                var n = this.args.length;
                commandOption = opts[n];
                if (!commandOption) throw new Error(`You have entered one or more values past the command's parameter count.  Make sure you have string values within quotes.  Value: ${val}`);

                // TODO: Implement the following code.  It's purpose is to assuming the trailing
                //       end of args is one string.
                //if (!commandOption) {
                //    commandOption = opts[n - 1];
                //    if (commandOption.type == CommandOptionType.String) {
                //        var arg = this.args[n - 1];
                //        var val = arg.value + " " + this.__remainingArgs;
                //        arg.setValue(val);
                //        break;
                //    }
                //    else throw new Error(`You have entered one or more values past the command's parameter count.  Value: ${val}`);
                //}

                name = commandOption.name;
            }

            var arg = new CommandOption(this.client, this.guild, commandOption);
            await arg.setValue(val);

            this.args.push(arg);
            this.__shift(match[0]);
        }

        this.initialized = true;
    }

    __matchArgs() {
        // This option pattern will match the following formats of options:
        //   key1=any-string-of-chars-w/o-spaces key2="A quoted string with spaces" key3='Another quoted string'
        //   any-string-of-chars-w/o-spaces      "A quoted string with spaces"      'Another quoted string'
        //   "A 'quoted string' inside another"  'A "quoted string" inside another'
        //   "An \"escaped quotation\" within a quote"  'An \'escaped quotation\' within a quote'
        //   /A regular expression/
        return this.__remainingArgs.match(/([a-zA-Z0-9_]* *= *)?(("|'|\/)((.|\r|\n)*?[^\\])\3|([^ ]+))/m);
    }

    __shift(str) {
        var pos = str.length + this.__remainingArgs.toLowerCase().indexOf(str.toLowerCase());

        var i = pos + 1;
        while (this.__remainingArgs[i] == ' ') i++;
        this.__remainingArgs = this.__remainingArgs.slice(i);
    }

    constructor(command, args) {
        if (args instanceof Message) {
            var len = command.data.name.length + args.content.indexOf(command.data.name);
            this.__origArgs = args.content.slice(len + 1);
        }
        else {
            throw new Error(`Invalid arg data for command ${command.data.name}!`);
        }

        this.guild = args.guild;
        this.client = args.client;
        this.command = command.data;
        this.args = [];
        this.__remainingArgs = this.__origArgs;
    }
}

class CommandOptionType {
    static Subcommand = 1;
    static SubcommandGroup = 2;
    static String = 3;
    static Integer = 4;
    static Boolean = 5;
    static User = 6;
    static Channel = 7;
    static Role = 8;
    static Mentionable = 9;
    static Number = 10;
}

module.exports = {
    CommandBuilder,
    CommandOption,
    CommandOptionResolver,
    CommandOptionType
};