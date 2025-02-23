/**********************************************************************************************************************
 *** HELPER FUNCTIONS
 */
module.exports = {
    name: "utils",
    init() { },
    roundDecimal(number, numPlaces) {
        return Math.round(number * 10 ** numPlaces) / 10 ** numPlaces;
    },
    formatTimestamp(timestamp) {
        var time = timestamp / (24 * 60 * 60 * 1000);
        var days = Math.floor(time);
        var tmp = (time - days) * 24;
        var hours = Math.floor(tmp);
        tmp = (tmp - hours) * 60;
        var minutes = Math.floor(tmp);
        tmp = (tmp - minutes) * 60;
        var seconds = Math.floor(tmp);

        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    },
    formatDate(date) {
        var year = date.getFullYear().toString();

        var month = (date.getMonth() + 1).toString();
        if (month.length == 1) {
            month = "0" + month;
        }

        var day = date.getDate().toString();
        if (day.length == 1) {
            day = "0" + day;
        }

        var hours = date.getHours().toString();
        if (hours.length == 1) {
            hours = "0" + hours;
        }

        var minutes = date.getMinutes().toString();
        if (minutes.length == 1) {
            minutes = "0" + minutes;
        }

        var seconds = date.getSeconds().toString();
        if (seconds.length == 1) {
            seconds = "0" + seconds;
        }

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    },
    addSlashes(str) {
        return str.replace("\"", "\\\"").replace("'", "\\'");
    },
    // This is incomplete
    printr(obj, maxDepth, curDepth) {
        var ret = "";

        if (!maxDepth) maxDepth = 3;
        if (!curDepth) curDepth = 0;

        for (let key in obj) {
            var line = this.pad(curDepth, "  ") + key + ":";

            var val = obj[key];

            if (val == null || val == undefined) {
                line += " null\n";
            }
            else if (typeof val == "boolean" || typeof val == "number") {
                line += " " + val + "\n";
            }
            else if (typeof val == "string") {
                line += " " + val + "\n";
            }
            else if (typeof val == "function") {
                line += " [object Function]";
            }
            else if (typeof val == "object") {
                if (curDepth < maxDepth) {
                    line += "\n" + this.printr(val, maxDepth, curDepth + 1);
                }
                else {
                    if (val instanceof Array) {
                        var elemType = val[0] ? val[0].constructor.name : "Object";

                        for (let elem of val) {
                            if (elem.constructor.name != elemType) {
                                elemType = "Object";
                                break;
                            }
                        }

                        line = ` [array ${elemType}]\n`;
                    }
                    else {
                        line = `: [object ${val.constructor.name}]\n`;
                    }
                }
            }
            else {
                line = " (UNKNOWN)\n";
            }

            ret += line;
        }

        return ret;
    },
    pad(len, token, str) {
        var ret = "";

        for (i = 0; i < len; i++)
            ret += token;

        return ret + (str ? str : "");
    },
    parseBoolean(str) {
        switch (str.toLowerCase().trim()) {
            case "true":
            case "t":
            case "yes":
            case "y":
            case "1":
                return true;

            case "false":
            case "f":
            case "no":
            case "n":
            case "0":
            case undefined:
                return false;

            default:
                return undefined;
        }
    },
    genId(length) {
        if (!length) length = 18;

        if (length > 10) {
            return this.genId(10) + this.genId(length - 10);
        }
        else {
            return (Math.floor(Math.random() * 10 ** length) + 10 ** (length - 1))
                .toString().slice(0, length);
        }
    }
}
