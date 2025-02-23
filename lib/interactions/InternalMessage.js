const TYPE = "APPLICATION_COMMAND";

module.exports = class {
    __src;

    author;
    channel;
    client;
    content;
    createdAt;
    guild;
    id;
    member;
    get type() {
        return TYPE;
    }

    delete() {
        return new Promise((resolve, reject) => {
            resolve();
        })
    }

    reply(argv) {
        return new Promise((resolve, reject) => {
            this.__src.reply(argv)
                .then(m => resolve(m))
                .catch(err => reject(err));
        });
    }

    constructor(content, srcMessage) {
        this.__src = srcMessage;

        this.author = srcMessage.author;
        this.channel = srcMessage.channel;
        this.client = srcMessage.client;
        this.content = content;
        this.createdAt = new Date();
        this.guild = srcMessage.guild;
        this.id = srcMessage.id;
        this.member = srcMessage.member;
    }
}