/*
 *    Copyright 2020 David Sarmiento Quintero
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

const XAPIConstants = require("./xapi_constants");
const {TLS, TLSSocket} = require("tls");
const {once, EventEmitter} = require("events");

/**
 * Javascript Implementation of the API to call remote operations on the XTB/X Open Hub xStation 5 platform
 * @version 2.5.0
 * @see http://developers.xstore.pro/documentation/2.5.0
 * @extends {EventEmitter}
 */
class XAPIClient extends EventEmitter {
    /** @type WeakMap<TLSSocket,string> */
    #data;
    /** @type boolean */
    isLoggedIn = false;
    /** @type string */
    #password;
    /** @type number */
    #pubSubPort;
    /** @type Map<String,TLSSocket> */
    #sockets;
    /** @type string */
    #streamSessionId;
    /** @type number */
    #tcpPort;
    /** @type string */
    #username;


    /**
     * Asynchronous Constructor
     * @param {string} username
     * @param {string} password
     * @param {boolean} isDemo
     */
     constructor(username, password, isDemo) {
        super();
        this.#username = username;
        this.#password = password;
        this.#tcpPort = (isDemo) ? XAPIConstants.DEMO_TCP_PORT : XAPIConstants.LIVE_TCP_PORT;
        this.#pubSubPort = (isDemo) ? XAPIConstants.DEMO_STREAM_PORT : XAPIConstants.LIVE_STREAM_PORT;
        this.#sockets = new Map();
        this.#data = new WeakMap();
        this._connectSocket("synchronous", this.#tcpPort);
        this.login().then(this.#streamSessionId);
    }


    /**
     * opens a socket and connects to the XTB/ XOpen Hub Server
     * @param  {string} name the name of the socket, this will be used to route
     * the async messages. Basically each "streaming" message has its own dedicated socket
     * @param {number} port port to which to connect
     * @return {TLSSocket}
     * @private
     */
    _connectSocket(name, port = this.#pubSubPort) {
        if (this.#sockets.has(name)) {
            console.log(`socket ${name} already exists. Doing nothing`);
            return this.#sockets.get(name);
        }
        const socket = TLS.connect(port, XAPIConstants.URL);
        socket.setEncoding("utf8");
        socket.setKeepAlive(true, 500);

        socket.once("tlsClientError", (data) => {
            throw new Error(data);
        });

        socket.once("close", () => {
            console.log(`Socket ${name} disconnected`);
            let socket = this.#sockets.get(name);
            this.#sockets.delete(name);
            this.#data.delete(socket);
        });

        socket.on("data", (rcvd) => {
            this._parseResponse(rcvd, socket);
        });

        this.#sockets.set(name, socket);
        this.#data.set(socket, "");
        return socket;
    }

    /**
     * parses the response and publishes an event so the corresponding
     * handle can take care of it
     * @param {string} rcvd message
     * @param {TLSSocket} socket socket which received the message
     */
    _parseResponse(rcvd, socket) {
        const response = this.#data.get(socket) + rcvd;
        //API messages are always terminated with two newlines
        if (rcvd.substring(-2) === "\n\n") {
            this.#data.set(socket, response);
            return;
        }
        this.#data.set(socket, "");
        let responseObj = JSON.parse(response);
        if (!responseObj.success) console.log("Error: " + responseObj.errorCode + " " + responseObj.errorDescr);
        this.emit(responseObj.customTag, responseObj);

    }

    /**
     * Returns array of all symbols available for the user.
     * @return
     */
    async getAllSymbols() {
        let payload = {command: "getAllSymbols", customTag: XAPIConstants.ALL_SYMBOLS};
        this.#sockets.get("synchronous").write(JSON.stringify(payload));
        const [response] = await once(this, XAPIConstants.ALL_SYMBOLS);
        return response;
    }

    /**
     * In order to perform any action client applications have to perform login process.
     * No functionality is available before a successful login.
     * After initial login, a new session is created and all commands can executed by an authenticated
     * user until he/she logs out or drops the connection.
     * @return {string} Stream session id
     */
    async login() {
        let payload = {
            command: "login", arguments: {
                userId: this.#username, password: this.#password
            }, customTag: XAPIConstants.LOGIN
        };
        this.#sockets.get("synchronous").write(JSON.stringify(payload));
        /** @type {XAPIConstants#LOGIN} */
        const [loginObj] = await once(this, XAPIConstants.LOGIN);
        if (!loginObj.status) throw new Error("Could not login");
        this.isLoggedIn = true;
        return loginObj.streamSessionId;
    }

    stopStreamBalance() {
        let payload = {
            command: "stopBalance", streamSessionId: this.#streamSessionId
        };
        this.#sockets.get(XAPIConstants.STREAM_BALANCE).write(JSON.stringify(payload));
    }

    /**
     * Unsubscribe from specific candles
     * @param {string} symbol
     */
    stopStreamGetCandles(symbol) {
        let payload = {
            command: "stopCandles", symbol: symbol, streamSessionId: this.#streamSessionId
        };
        this.#sockets.get(XAPIConstants.STREAM_CANDLES).write(JSON.stringify(payload));
    }

    stopStreamGetNews() {
        let payload = {
            command: "stopNews", streamSessionId: this.#streamSessionId
        };
        this.#sockets.get(XAPIConstants.STREAM_NEWS).write(JSON.stringify(payload));
    }

    stopStreamGetProfits() {
        let payload = {
            command: "stopProfits", streamSessionId: this.#streamSessionId
        };
        this.#sockets.get(XAPIConstants.STREAM_PROFITS).write(JSON.stringify(payload));
    }

    stopStreamGetTickPrices(symbol) {
        let payload = {
            command: "stopTickPrices",
            symbol: symbol,
            streamSessionId: this.#streamSessionId
        };
        this.#sockets.get(XAPIConstants.STREAM_TICK_PRICES).write(JSON.stringify(payload));
    }

    stopStreamGetTradeStatus(symbol) {
        let payload = {
            command: "stopTradeStatus",
            symbol: symbol,
            streamSessionId: this.#streamSessionId
        };
        this.#sockets.get(XAPIConstants.STREAM_TRADE_STATUS).write(JSON.stringify(payload));
    }

    stopStreamGetTrades(symbol) {
        let payload = {
            command: "stopTrades", symbol: symbol, streamSessionId: this.#streamSessionId
        };
        this.#sockets.get(XAPIConstants.STREAM_TRADES).write(JSON.stringify(payload));
    }

    stopStreamKeepAlive() {
        let payload = {
            command: "stopKeepAlive", streamSessionId: this.#streamSessionId
        };
        this.#sockets.get(XAPIConstants.STREAM_KEEP_ALIVE).write(JSON.stringify(payload));
    }

    /**
     * Allows to get actual account indicators values in real-time, as soon as they are available in the system.
     * @fires XAPIConstants#STREAM_BALANCE
     */
    streamGetBalance() {
        let payload = {
            command: "getBalance",
            streamSessionId: this.#streamSessionId,
            customTag: XAPIConstants.STREAM_BALANCE
        };

        const ownSocket = this._connectSocket(XAPIConstants.STREAM_BALANCE);
        ownSocket.write(JSON.stringify(payload));
    }

    /**
     * Subscribes to API chart candles. The interval of every candle is 1 minute.
     * A new candle arrives every minute.
     * @param {string} symbol
     * @fires XAPIConstants#STREAM_CANDLES
     */
    streamGetCandles(symbol) {
        let payload = {
            command: "getCandles",
            symbol: symbol,
            streamSessionId: this.#streamSessionId,
            customTag: XAPIConstants.STREAM_CANDLES
        };
        const ownSocket = this._connectSocket(XAPIConstants.STREAM_BALANCE);
        ownSocket.write(JSON.stringify(payload));

    }

    /**
     * Subscribes to news.
     * @fires XAPIConstants#STREAM_NEWS
     */
    streamGetNews() {
        let payload = {
            command: "getNews",
            streamSessionId: this.#streamSessionId,
            customTag: XAPIConstants.STREAM_NEWS
        };
        const ownSocket = this._connectSocket(XAPIConstants.STREAM_NEWS);
        ownSocket.write(JSON.stringify(payload));
    }

    /**
     * Subscribes to profits
     * @fires XAPIConstants#STREAM_PROFITS
     */
    streamGetProfits() {
        let payload = {
            command: "getProfits",
            streamSessionId: this.#streamSessionId,
            customTag: XAPIConstants.STREAM_PROFITS
        };
        const ownSocket = this._connectSocket(XAPIConstants.STREAM_PROFITS);
        ownSocket.write(JSON.stringify(payload));
    }

    /**
     * Establishes subscription for quotations and allows to obtain the relevant information in real-time,
     * as soon as it is available in the system. The getTickPrices command can be invoked many times
     * for the same symbol, but only one subscription for a given symbol will be created.
     * Please beware that when multiple records are available, the order in which they are received
     * is not guaranteed.
     * minArrivalTime
     * @param {string} symbol Symbol
     * @param {number} minArrivalTime The minimal interval in milliseconds between any two consecutive updates.
     * @param {number} maxLevel
     * @fires XAPIConstants#STREAM_TICK_PRICES
     */
    streamGetTickPrices(symbol, {minArrivalTime = 0, maxLevel}) {
        let payload = {
            command: "getTickPrices",
            minArrivalTime: minArrivalTime,
            symbol: symbol,
            maxLevel: maxLevel,
            streamSessionId: this.#streamSessionId,
            customTag: XAPIConstants.STREAM_TICK_PRICES
        };
        const ownSocket = this._connectSocket(XAPIConstants.TICK_PRICES);
        ownSocket.write(JSON.stringify(payload));
    }

    /**
     * Allows to get status for sent trade requests in real-time, as soon as it is
     * available in the system. Please beware that when multiple records are available,
     * the order in which they are received is not guaranteed.
     * @fires XAPIConstants#STREAM_TRADE_STATUS
     */
    streamGetTradeStatus() {
        let payload = {
            command: "getTradeStatus",
            streamSessionId: this.#streamSessionId,
            customTag: XAPIConstants.STREAM_TRADE_STATUS
        };
        const ownSocket = this._connectSocket(XAPIConstants.STREAM_TRADE_STATUS);
        ownSocket.write(JSON.stringify(payload));
    }

    /**
     * Establishes subscription for user trade status data and allows to obtain the
     * relevant information in real-time, as soon as it is available in the system.
     * Please beware that when multiple records are available, the order in which
     * they are received is not guaranteed.
     * @see http://developers.xstore.pro/documentation/2.5.0#streamgetTrades
     * @fires XAPIConstants#STREAM_TRADES
     */
    streamGetTrades() {
        let payload = {
            command: "getTrades",
            streamSessionId: this.#streamSessionId,
            customTag: XAPIConstants.STREAM_TRADES
        };
        const ownSocket = this._connectSocket(XAPIConstants.STREAM_TRADES);
        ownSocket.write(JSON.stringify(payload));
    }

    /**
     * Subscribes to 'keep alive' messages.
     * A new 'keep alive' message is sent by the API every 3 seconds
     * @fires XAPIConstants#STREAM_KEEP_ALIVE
     */
    streamKeepAlive() {
        let payload = {
            command: "keepAlive",
            streamSessionId: this.#streamSessionId,
            customTag: XAPIConstants.STREAM_KEEP_ALIVE
        };
        const ownSocket = this._connectSocket(XAPIConstants.STREAM_KEEP_ALIVE);
        ownSocket.write(JSON.stringify(payload));
    }

    /**
     * Regularly calling this function is enough to refresh the internal state of all the
     * components in the system. Streaming connection, when any command is not sent by
     * client in the session, generates only one way network traffic. It is recommended
     * that any application that does not execute other commands, should call this
     * command at least once every 10 minutes.
     */
    streamPing() {
        let payload = {
            command: "ping",
            streamSessionId: this.#streamSessionId,
            customTag: XAPIConstants.STREAM_PING
        };
        const ownSocket = this._connectSocket(XAPIConstants.STREAM_PING);
        ownSocket.write(JSON.stringify(payload));
        ownSocket.destroy();
    }

    /*

     getCalendar
     getChartLastRequest
     getChartRangeRequest
     getCommissionDef
     getCurrentUserData
     getIbsHistory
     getMarginLevel
     getMarginTrade
     getNews
     getProfitCalculation
     getServerTime
     getStepRules
     getSymbol
     getTickPrices
     getTradeRecords
     getTrades
     getTradesHistory
     getTradingHours
     getVersion
     ping
     tradeTransaction
     tradeTransactionStatus

     */

}

exports = XAPIClient;

/**
 * Login Response
 * @event XAPIConstants#LOGIN
 * @typedef XAPIConstants#LOGIN
 * @type {object}
 * @property {boolean} status
 * @property {string} streamSessionId
 */

/**
 * Balance Message
 * @event XAPIConstants#STREAM_BALANCE
 * @typedef XAPIConstants#STREAM_BALANCE
 * @type {object}
 * @property {number} balance balance in account currency
 * @property {number} credit credit in account currency
 * @property {number} equity sum of balance and all profits in account currency
 * @property {number} margin margin requirements
 * @property {number} marginFree free margin
 * @property {number} marginLevel margin level percentage
 */

/**
 * Candle Record
 * @event XAPIConstants#STREAM_CANDLES
 * @typedef XAPIConstants#STREAM_CANDLES
 * @type {object}
 * @property {type} name description
 * @property {number} close Close price in base currency
 * @property {number} ctm Candle start time in CET time zone (Central European Time)
 * @property {string} ctmString String representation of the ctm field
 * @property {number} high Highest value in the given period in base currency
 * @property {number} low Lowest value in the given period in base currency
 * @property {number} open Open price in base currency
 * @property {number} quoteId Source of price
 * @property {string} symbol Symbol
 * @property {number} vol Volume in lots*/

/**
 * Streaming News Record
 * @event XAPIConstants#STREAM_NEWS
 * @typedef XAPIConstants#STREAM_NEWS
 * @type {object}
 * @property {string}  body Body
 * @property {string}  key News key
 * @property {number}  time Time
 * @property {string}  title News title
 */

/**
 * Streaming Profit Record
 * @event XAPIConstants#STREAM_PROFITS
 * @typedef XAPIConstants#STREAM_PROFITS
 * @type {object}
 * @property {number}  order Order number
 * @property {number}  order2 Transaction ID
 * @property {number}  position Position number
 * @property {number}  profit Profit in account currency
 */

/**
 * Streaming Tick Record
 * @event XAPIConstants#STREAM_TICK_PRICES
 * @typedef XAPIConstants#STREAM_TICK_PRICES
 * @type {object}
 * @property {number}  ask Ask price in base currency
 * @property {number}  askVolume Number of available lots to buy at given price or null if not applicable
 * @property {number}  bid Bid price in base currency
 * @property {number}  bidVolume Number of available lots to buy at given price or null if not applicable
 * @property {number}  high The highest price of the day in base currency
 * @property {number}  level Price level
 * @property {number}  low The lowest price of the day in base currency
 * @property {number}  quoteId Source of price, detailed description below
 * @property {number}  spreadRaw The difference between raw ask and bid prices
 * @property {number}  spreadTable Spread representation
 * @property {string}  symbol Symbol
 * @property {time}  timestamp Timestamp
 */

/**
 * Streaming Trade Status Record
 * @event XAPIConstants#STREAM_TRADE_STATUS
 * @typedef  XAPIConstants#STREAM_TRADE_STATUS
 * @type {object}
 * @property {string}  customComment The value the customer may provide in order to retrieve it later.
 * @property {string}  message Can be null
 * @property {number}  order Unique order number
 * @property {number}  price Price in base currency
 * @property {number}  requestStatus Request status code, described below
 */

/**
 * Streaming Trade Record
 * @event XAPIConstants#STREAM_TRADES
 * @typedef XAPIConstants#STREAM_TRADES
 * @type {object}
 * @property {number} close_price Close price in base currency
 * @property {time} close_time Null if order is not closed
 * @property {boolean} closed Closed
 * @property {XAPIConstants#STREAM_TRADES_CMD} cmd Operation code
 * @property {string} comment Comment
 * @property {number} commission Commission in account currency, null if not applicable
 * @property {string} customComment The value the customer may provide in order to retrieve it later.
 * @property {number} digits Number of decimal places
 * @property {time} expiration Null if order is not closed
 * @property {number} margin_rate Margin rate
 * @property {number} offset Trailing offset
 * @property {number} open_price Open price in base currency
 * @property {time} open_time Open time
 * @property {number} order Order number for opened transaction
 * @property {number} order2 Transaction id
 * @property {number} position Position number (if type is 0 and 2) or transaction parameter (if type is 1)
 * @property {number} profit null unless the trade is closed (type=2) or opened (type=0)
 * @property {number} sl Zero if stop loss is not set (in base currency)
 * @property {XAPIConstants#STREAM_TRADES_STATE} state Trade state, should be used for detecting pending order's cancellation
 * @property {number} storage Storage
 * @property {string} symbol Symbol
 * @property {number} tp Zero if take profit is not set (in base currency)
 * @property {XAPIConstants#STREAM_TRADES_TYPE} type type
 * @property {number} volume Volume in lots
 */

/**
 * Streaming Keep Alive Record
 * @event XAPIConstants#STREAM_KEEP_ALIVE
 * @typedef XAPIConstants#STREAM_KEEP_ALIVE
 * @type {object}
 * @property {number} timestamp Current Timestamp
 */
/*


 */