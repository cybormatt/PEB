const mysql = require('mysql2');
const CONFIG = require("../config");
const logger = require('./logger');

exports.getConnection = function () {
    var con = mysql.createConnection({
        host: CONFIG.SQL.host,
        user: CONFIG.SQL.user,
        password: CONFIG.SQL.password,
        database: CONFIG.SQL.database,
        charset: "utf8mb4"
    });

    return con;
}

exports.runQuery = function (sql) {
    return new Promise(function (resolve, reject) {
        const con = exports.getConnection();

        con.connect(function (cnx_err) {
            if (cnx_err) {
                logger.error("*** SQL Connection Error: " + cnx_err.stack);
                reject(new Error(`Failed while trying to connect to SQL database.  Message:\n${cnx_err.message}`));
                return;
            }

            con.query(sql, function (err, result) {
                con.end();

                if (err) {
                    logger.error("*** SQL Query Error: " + err.stack);
                    reject(`Failed to execute SQL query.  Message:\n${err.message}`);
                    return;
                }

                resolve(result);
            })
        });
    });
}