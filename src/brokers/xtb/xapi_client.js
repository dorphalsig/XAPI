/*
 *    Copyright 2020 David Sarmiento <dorphalsig@gmail.com>
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

'use strict';

const XAPIConstants = require('./xapi_constants');
const Tls = require('tls');
const { once, on, EventEmitter } = require('events');

/**
 * Javascript Implementation of the API to call remote operations on the XTB/X Open Hub xStation 5 platform
 * @version 2.5.0
 * @see http://developers.xstore.pro/documentation/2.5.0
 * @extends {EventEmitter}
 * @todo define a maximum amount of messages/s that can go in a single  streaming socket and then have the sockets identify if a new one must be opened
 * @todo have an internal event emitter and remove the public events. Streaming methods become async generators
 */
class XApiClient extends EventEmitter {

  /**
   * @readonly
   * @enum {number}
   */
  static Period = Object.freeze({
    PERIOD_M1: 1,
    PERIOD_M5: 5,
    PERIOD_M15: 15,
    PERIOD_M30: 30,
    PERIOD_H1: 60,
    PERIOD_H4: 240,
    PERIOD_D1: 1440,
    PERIOD_W1: 10080,
    PERIOD_MN1: 43200,
  });
  /**
   * @readonly
   * @enum {number}
   */
  static command = Object.freeze({
    BUY: 0, SELL: 1, BUY_LIMIT: 2, SELL_LIMIT: 3, BUY_STOP: 4, SELL_STOP: 5, BALANCE: 6, CREDIT: 7,
  });
  /**
   * @readonly
   * @enum {number}
   */
  static quoteId = Object.freeze({ FIXED: 1, FLOAT: 2, DEPTH: 3, CROSS: 4 });
  /**
   * @readonly
   * @enum {number}
   */
  static streamTradeStatus = Object.freeze({
    ERROR: 0, PENDING: 1, ACCEPTED: 3, REJECTED: 4,
  });
  /**
   * @readonly
   * @enum {string}
   */
  static streamTradesState = Object.freeze({
    MODIFIED: 'modified', DELETED: 'deleted',
  });
  /**
   * @readonly
   * @enum {number}
   */
  static tradeType = Object.freeze({
    OPEN: 0, PENDING: 1, CLOSE: 2, MODIFY: 3, DELETE: 4,
  });
  /**
   * Returns various account indicators
   * Note: streamBalance is the preferred way of retrieving account
   * @returns {Promise<Balance>}
   * indicators.
   */

  /** @type {WeakMap<TLSSocket,string>} */
  #data;
  /** @type {boolean} */
  isLoggedIn;
  /** @type {string} */
  #password;
  /** @type {number} */
  #port;
  /** @type {Map<String,TLSSocket>} */
  #sockets;
  /** @type {number} */
  #streamPort;
  /** @type {string} */
  #streamSessionId;
  /** @type {string} */
  #username;

  /**
   * Asynchronous Constructor
   * @param {string} username
   * @param {string} password
   * @param {boolean} isDemo
   */
  constructor (username, password, isDemo) {
    super();
    this.#username = username;
    this.#password = password;
    this.#port = (isDemo) ? config.DEMO_PORT : config.LIVE_PORT;
    this.#streamPort = (isDemo) ? config.DEMO_STREAM_PORT : config.LIVE_STREAM_PORT;
    this.#sockets = new Map();
    this.#data = new WeakMap();
    this._connectSocket('synchronous', this.#port);
  }

  /**
   * generic method that sends a message to the server and (asynchronously) waits for a reply
   * @param {string} operationName
   * @param {string} customTag
   * @param {Object} args the operation parameters
   * */
  async _callOperation (operationName, customTag, args = {}) {
    this._checkLoggedIn();
    let payload = { command: operationName, customTag: customTag };
    if (Object.keys(args).length !== 0 || args.constructor !== Object) {
      payload.arguments = args;
    }
    this.#sockets.get('synchronous').write(JSON.stringify(payload));
    const [response] = await once(this, customTag);
    return response;
  }

  _checkLoggedIn () {
    if (!this.isLoggedIn) {
      throw new Error('Not logged in');
    }
  }

  /**
   * opens a socket and connects to the XTB/ XOpen Hub Server
   * @param  {string} name the name of the socket, this will be used to route
   * the async messages. Basically each streaming message has its own dedicated socket
   * @param {number} port port to which to connect
   * @return {TLSSocket}
   * @private
   */
  _connectSocket (name, port = this.#streamPort) {
    if (this.#sockets.has(name)) {
      console.log(`socket ${name} already exists. Doing nothing`);
      return this.#sockets.get(name);
    }
    const socket = Tls.connect(port, config.ENDPOINT);
    socket.setEncoding('utf8');
    socket.setKeepAlive(true, 500);

    socket.once('tlsClientError', (data) => {
      throw new Error(data);
    });

    socket.once('close', () => {
      console.log(`Socket ${name} disconnected`);
      let socket = this.#sockets.get(name);
      this.#sockets.delete(name);
      this.#data.delete(socket);
    });

    socket.on('data', (rcvd) => {
      this._parseResponse(rcvd, socket);
    });

    this.#sockets.set(name, socket);
    this.#data.set(socket, '');
    return socket;
  }

  /**
   * parses the response and publishes an event so the corresponding
   * handler can take care of it
   * @param {string} rcvd message
   * @param {TLSSocket} socket socket which received the message
   */
  _parseResponse (rcvd, socket) {
    let responses = (this.#data.get(socket) + rcvd).trim().split('\n\n');
    //API messages are always terminated with two newlines
    const remainder = (rcvd.lastIndexOf('\n\n') === rcvd.length - 2) ? '' : responses.pop();
    this.#data.set(socket, remainder);

    for (let response of responses) {
      let responseObj = JSON.parse(response);
      const tag = responseObj.customTag;
      if (responseObj.status) {
        let returnData = responseObj.customTag === XAPIConstants.LOGIN
          ? responseObj.streamSessionId
          : responseObj.returnData;
        this.emit(responseObj.customTag, returnData);
        continue;
      }
      this.emit(XAPIConstants.ERROR_PREFIX + responseObj.customTag, responseObj);
      console.log(`Error: ${responseObj.errorCode} ${responseObj.errorDescr}`);
    }
  }

  _shutdown () {
    this.#sockets.forEach((socket, name) => { socket.destroy();});
    this.removeAllListeners();
  }

  /**
   * Returns array of all symbols available for the user.
   * @return {Promise<TickerSymbol[]>}
   */
  getAllSymbols () {
    return this._callOperation('getAllSymbols', XAPIConstants.ALL_SYMBOLS);
  }

  /**
   * Returns calendar with market events.
   * @returns {Promise<Calendar[]>}
   */
  getCalendar () {
    return this._callOperation('getCalendar', XAPIConstants.CALENDAR);
  }

  /**
   * Returns chart info, from start date to the current time.
   * Note: streamCandles is the preferred way of retrieving current candle data.
   * @param {XApiClient.Period} period
   * @param {number} start
   * @param {string} symbol
   * @returns {Promise<Candle>}
   * @see http://developers.xstore.pro/documentation/#getChartLastRequest
   */
  getChartLastRequest (period, start, symbol) {
    return this._callOperation('getCalendar', XAPIConstants.CHART_LAST_REQUEST,
      { period: period, start: start, symbol: symbol });
  }

  /**
   * Returns chart info with data between given start and end dates.
   * If ticks is not set or value is 0, valid start and end time must be specified
   * If ticks >0 (e.g. N) then API returns N candles AFTER start. end is ignored
   * If ticks <0 then API returns N candles BEFORE start. end is ignored
   *
   * Note: streamCandles is the preferred way of retrieving current candle data.
   * @param {number} start timestamp
   * @param {number} end timestamp
   * @param {XApiClient.Period} period
   * @param {string} symbol
   * @param {number} ticks
   * @returns {Promise<Candle>}
   * @see http://developers.xstore.pro/documentation/#getChartRangeRequest
   */
  getChartRangeRequest (start, end, period, symbol, ticks = 0) {
    return this._callOperation('getChartRangeRequest', XAPIConstants.CHART_RANGE_REQUEST,
      { start: start, end: end, period: period, symbol: symbol, ticks: ticks });
  }

  /**
   * Returns calculation of commission and rate of exchange.
   * The value is calculated as expected value, and therefore might not be
   * perfectly accurate.
   * @param {string} tickerSymbol
   * @param {number} volume
   * @returns {Promise<Commission>}
   */
  getCommissionDef (tickerSymbol, volume) {
    return this._callOperation('getCommissionDef', XAPIConstants.COMMISSION_DEF,
      { symbol: tickerSymbol, volume: volume });
  }

  /**
   * Returns information about account currency, and account leverage
   * for the current API user
   * @returns {Promise<UserData>}
   */
  getCurrentUserData () {
    return this._callOperation('getCurrentUserData', XAPIConstants.CURRENT_USER_DATA);
  }

  /**
   * Returns IBs data from the given time range.
   * @param {number} start (timestamp) Start of IBs history block
   * @param {number} end (timestamp) End of IBs history block
   * @returns {Promise<IB[]>}
   */
  getIbsHistory (start, end) {
    return this._callOperation('getIbsHistory', XAPIConstants.IBS_HISTORY,
      { end: end, start: start });
  }

  getMarginLevel () {
    const result = this._callOperation('getMarginLevel', XAPIConstants.MARGIN_LEVEL);
    result.marginFree = result.margin_free;
    result.marginLevel = result.margin_level;
    return result;
  }

  /**
   * Returns expected margin for given instrument and volume.
   * The value is calculated as expected margin value, and therefore might not
   * be perfectly accurate.
   * @param symbol
   * @param volume
   * @returns {Promise<Margin>}
   */
  getMarginTrade (symbol, volume) {
    return this._callOperation('getMarginTrade', XAPIConstants.MARGIN_TRADE,
      { symbol: symbol, volume: volume });
  }

  /**
   * Returns news from trading server which were sent within specified Period
   * of time.
   * Note: streamNews is the preferred way of retrieving news data.
   * @param {number} start (timestamp)
   * @param {number} end (timestamp)
   * @returns {Promise<News[]>}
   */
  getNews (start, end) {
    return this._callOperation('getMarginLevel', XAPIConstants.MARGIN_LEVEL,
      { symbol: symbol, volume: volume });
  }

  /**
   * Calculates estimated profit for given deal data Should be used for
   * calculator-like apps only. Profit for opened transactions should be
   * taken from server, due to higher precision of server calculation.
   * @param {XApiClient.command} cmd Operation code
   * @param {string} symbol symbol
   * @param {number} volume volume
   * @param {number} closePrice theoretical close price of order
   * @param {number} openPrice theoretical open price of order
   * @returns {Promise<ProfitCalculation>}
   */
  getProfitCalculation (cmd, symbol, volume, openPrice, closePrice) {
    return this._callOperation('getProfitCalculation', XAPIConstants.PROFIT_CALCULATION, {
      cmd: cmd, symbol: symbol, volume: volume, openPrice: openPrice, closePrice: closePrice,
    });
  }

  /**
   * Returns current time on trading server.
   * @returns {Promise<ServerTime>}
   */
  getServerTime () {
    return this._callOperation('getServerTime', XAPIConstants.SERVER_TIME);
  }

  /**
   * Returns a list of step rules for DMAs
   * @returns {Promise<StepRule[]>}
   */
  getStepRules () {
    return this._callOperation('getStepRules', XAPIConstants.STEP_RULES);
  }

  /**
   * Returns information about symbol available for the user.
   * @returns {Promise<TickerSymbol>}
   */
  getSymbol () {
    return this._callOperation('getSymbol', XAPIConstants.SYMBOL);
  }

  /**
   * Returns array of current quotations for given symbols, only quotations that
   * changed from given timestamp are returned. New timestamp obtained from
   * output will be used as an argument of the next call of this command.
   * streamTickPrices is the preferred way of retrieving ticks data.
   * @param {number} level price level
   * @param {string[]} symbols Array of symbol names
   * @param {number} timestamp The time from which the most recent tick should
   * be looked for. Historical prices cannot be obtained using this parameter.
   * It can only be used to verify whether a price has changed since the given
   * time.
   * @returns {Promise<TickPrice[]>}
   * @see http://developers.xstore.pro/documentation/#getTickPrices
   */
  getTickPrices (level, symbols, timestamp) {
    return this._callOperation('getTickPrices', XAPIConstants.TICK_PRICES,
      { level: level, symbols: symbols, timestamp: timestamp });
  }

  /**
   * Returns array of trades listed in orders argument.
   * @param {number[]} orders Array of orders (position numbers)
   * @returns {Promise<Trade[]>}
   */
  getTradeRecords (orders) {
    return this._callOperation('getTradeRecords', XAPIConstants.TRADE_RECORDS, { orders: orders });
  }

  /**
   * Returns array of user's trades
   * Note: streamTrades is the preferred way of retrieving trades data.
   * @param {boolean} openedOnly if true then only open trades will be returned
   * @returns {Promise<Trade[]>}
   */
  getTrades (openedOnly) {
    return this._callOperation('getTrades', XAPIConstants.TRADES, { openedOnly: openedOnly });
  }

  /**
   * Returns array of user's trades which were closed within specified Period
   * of time.
   * Note: streamTrades is the preferred way of retrieving trades data.
   * @param {number} start (timestamp)
   * @param {number} end (timestamp)
   * @returns {Promise<Trade[]>}
   */
  getTradesHistory (start, end) {
    return this._callOperation('getTradesHistory', XAPIConstants.TRADES_HISTORY,
      { start: start, end: end });
  }

  /**
   * Returns quotes and trading times.
   * @param {string[]} symbols
   * @returns {Promise<TradingHours[]>}
   */
  getTradingHours (symbols) {
    return this._callOperation('getTradingHours', XAPIConstants.TRADING_HOURS);
  }

  /**
   * Returns the current API version.
   * @returns {Promise<Version>}
   */
  getVersion () {
    return this._callOperation('getVersion', XAPIConstants.VERSION);
  }

  /**
   * In order to perform any action client applications have to perform login process.
   * No functionality is available before a successful login.
   * After initial login, a new session is created and all commands can executed by an authenticated
   * user until he/she logs out or drops the connection.
   */
  async login () {

    this.once(XAPIConstants.ERROR_PREFIX + XAPIConstants.LOGIN, response => {
      throw new Error(`Could not log in: ${response.errorDescr} (${response.errorCode})`);
    });

    let payload = {
      command: 'login', arguments: {
        userId: this.#username, password: this.#password,
      }, customTag: XAPIConstants.LOGIN,
    };

    this.#sockets.get('synchronous').write(JSON.stringify(payload));
    [this.#streamSessionId] = await once(this, XAPIConstants.LOGIN);
    this.isLoggedIn = true;
    this.removeAllListeners(XAPIConstants.ERROR_PREFIX + XAPIConstants.LOGIN);
    return true;
  }

  logout () {
    this._callOperation('logout', '');
    this.isLoggedIn = false;
    this.removeAllListeners();

  }

  ping () {
    return this._callOperation('ping', XAPIConstants.PING);
  }

  stopStreamBalance () {
    this._checkLoggedIn();
    let payload = {
      command: 'stopBalance', streamSessionId: this.#streamSessionId,
    };
    this.#sockets.get(XAPIConstants.STREAM_BALANCE).
      write(JSON.stringify(payload));
  }

  stopStreamCandles (symbol) {
    let payload = {
      command: 'stopCandles', symbol: symbol, streamSessionId: this.#streamSessionId,
    };
    this.#sockets.get(XAPIConstants.STREAM_CANDLES).
      write(JSON.stringify(payload));
  }

  stopStreamKeepAlive () {
    let payload = {
      command: 'stopKeepAlive', streamSessionId: this.#streamSessionId,
    };
    this.#sockets.get(XAPIConstants.STREAM_KEEP_ALIVE).
      write(JSON.stringify(payload));
  }

  stopStreamNews () {
    let payload = {
      command: 'stopNews', streamSessionId: this.#streamSessionId,
    };
    this.#sockets.get(XAPIConstants.STREAM_NEWS).write(JSON.stringify(payload));
  }

  stopStreamProfits () {
    let payload = {
      command: 'stopProfits', streamSessionId: this.#streamSessionId,
    };
    this.#sockets.get(XAPIConstants.STREAM_PROFITS).
      write(JSON.stringify(payload));
  }

  stopStreamTickPrices (symbol) {
    let payload = {
      command: 'stopTickPrices', symbol: symbol, streamSessionId: this.#streamSessionId,
    };
    this.#sockets.get(XAPIConstants.STREAM_TICK_PRICES).
      write(JSON.stringify(payload));
  }

  stopStreamTradeStatus (symbol) {
    let payload = {
      command: 'stopTradeStatus', symbol: symbol, streamSessionId: this.#streamSessionId,
    };
    this.#sockets.get(XAPIConstants.STREAM_TRADE_STATUS).
      write(JSON.stringify(payload));
  }

  stopStreamTrades (symbol) {
    let payload = {
      command: 'stopTrades', symbol: symbol, streamSessionId: this.#streamSessionId,
    };
    this.#sockets.get(XAPIConstants.STREAM_TRADES).
      write(JSON.stringify(payload));
  }

  /**
   * Allows to get actual account indicators values in real-time, as soon as they are available in the system.
   * @yields {Balance}
   */
  streamBalance () {
    let payload = {
      command: 'getBalance',
      streamSessionId: this.#streamSessionId,
      customTag: XAPIConstants.STREAM_BALANCE,
    };

    const ownSocket = this._connectSocket(XAPIConstants.STREAM_BALANCE);
    ownSocket.write(JSON.stringify(payload));
  }

  /**
   * Subscribes to API chart candles. The interval of every candle is 1 minute.
   * A new candle arrives every minute.
   * @param {string} symbol
   * @yields {Candle}
   */
  streamCandles (symbol) {
    this._checkLoggedIn();

    let payload = {
      command: 'getCandles',
      symbol: symbol,
      streamSessionId: this.#streamSessionId,
      customTag: XAPIConstants.STREAM_CANDLES,
    };
    const ownSocket = this._connectSocket(XAPIConstants.STREAM_CANDLES);
    ownSocket.write(JSON.stringify(payload));
  }

  /**
   * Subscribes to 'keep alive' messages.
   * A new 'keep alive' message is sent by the API every 3 seconds
   * @fires XAPIConstants#.STREAM_KEEP_ALIVE
   */
  streamKeepAlive () {
    let payload = {
      command: 'keepAlive',
      streamSessionId: this.#streamSessionId,
      customTag: XAPIConstants.STREAM_KEEP_ALIVE,
    };
    const ownSocket = this._connectSocket(XAPIConstants.STREAM_KEEP_ALIVE);
    ownSocket.write(JSON.stringify(payload));
  }

  /**
   * Subscribes to news.
   * @return News
   */
  streamNews () {
    let payload = {
      command: 'getNews',
      streamSessionId: this.#streamSessionId,
      customTag: XAPIConstants.STREAM_NEWS,
    };
    const ownSocket = this._connectSocket(XAPIConstants.STREAM_NEWS);
    ownSocket.write(JSON.stringify(payload));
  }

  /**
   * Regularly calling this function is enough to refresh the internal state of all the
   * components in the system. Streaming connection, when any command is not sent by
   * client in the session, generates only one way network traffic. It is recommended
   * that any application that does not execute other commands, should call this
   * command at least once every 10 minutes.
   */
  streamPing () {
    let payload = {
      command: 'ping', streamSessionId: this.#streamSessionId, customTag: XAPIConstants.STREAM_PING,
    };
    const ownSocket = this._connectSocket(XAPIConstants.STREAM_PING);
    ownSocket.write(JSON.stringify(payload));
    ownSocket.destroy();
  }

  /**
   * Subscribes to profits
   * @yields Profit
   */
  streamProfits () {
    let payload = {
      command: 'getProfits',
      streamSessionId: this.#streamSessionId,
      customTag: XAPIConstants.STREAM_PROFITS,
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
   * @yields TickPrice
   */
  streamTickPrices (symbol, { minArrivalTime = 0, maxLevel }) {
    let payload = {
      command: 'getTickPrices',
      minArrivalTime: minArrivalTime,
      symbol: symbol,
      maxLevel: maxLevel,
      streamSessionId: this.#streamSessionId,
      customTag: XAPIConstants.STREAM_TICK_PRICES,
    };
    const ownSocket = this._connectSocket(XAPIConstants.TICK_PRICES);
    ownSocket.write(JSON.stringify(payload));
  }

  /**
   * Allows to get status for sent trade requests in real-time, as soon as it is
   * available in the system. Please beware that when multiple records are available,
   * the order in which they are received is not guaranteed.
   * @fires XAPIConstants#.STREAM_TRADE_STATUS
   */
  streamTradeStatus () {
    let payload = {
      command: 'getTradeStatus',
      streamSessionId: this.#streamSessionId,
      customTag: XAPIConstants.STREAM_TRADE_STATUS,
    };
    const ownSocket = this._connectSocket(XAPIConstants.STREAM_TRADE_STATUS);
    ownSocket.write(JSON.stringify(payload));
  }

  /**
   * Establishes subscription for user trade status data and allows to obtain the
   * relevant information in real-time, as soon as it is available in the system.
   * Please beware that when multiple records are available, the order in which
   * they are received is not guaranteed.
   * @see http://developers.xstore.pro/documentation/2.5.0#streamTrades
   * @yields Trade
   */
  streamTrades () {
    let payload = {
      command: 'getTrades',
      streamSessionId: this.#streamSessionId,
      customTag: XAPIConstants.STREAM_TRADES,
    };
    const ownSocket = this._connectSocket(XAPIConstants.STREAM_TRADES);
    ownSocket.write(JSON.stringify(payload));
  }

  /**
   * Starts trade transaction. tradeTransaction sends main transaction
   * information to the server.
   * @param {XApiClient.command} cmd Operation code
   * @param {string} customComment The value the customer may provide in order
   * to retrieve it later.
   * @param {number} expiration Pending order expiration time (timestamp)
   * @param {number} offset Trailing offset
   * @param {number} order 0 or position number for closing/modifications
   * @param {number} price Trade price
   * @param {number} sl Stop loss
   * @param {string} symbol Trade symbol
   * @param {number} tp Take profit
   * @param {XApiClient.tradeType} type Trade transaction type
   * @param {number} volume Trade volume
   * @returns {Promise<Order>}
   */
  tradeTransaction (cmd, customComment, expiration, offset, order, price, sl, symbol, tp, type,
    volume) {
    return this._callOperation('tradeTransaction', XAPIConstants.TRADE_TRANSACTION, {
      tradeTransInfo: {
        cmd: cmd,
        customComment: customComment,
        expiration: expiration,
        offset: offset,
        order: order,
        price: price,
        sl: sl,
        symbol: symbol,
        tp: tp,
        type: type,
        volume: volume,
      },
    });
  }

  /**
   * Returns current transaction status. At any time of transaction processing
   * client might check the status of transaction on server side. In order to
   * do that client must provide unique order taken from tradeTransaction.
   * Note: XApiClient#streamTradeStatus is the preferred way of retrieving transaction status data.
   * @param {number} order  order number from tradeTransaction
   * @returns {Promise<TradeStatus>}
   */
  async tradeTransactionStatus (order) {
    let response = await this._callOperation('tradeTransactionStatus',
      XAPIConstants.TRADE_TRANSACTION_STATUS, { order: order });
    if (response.ask !== response.bid) {
      throw new Error(
        `Error retrieving transaction price: Ask was ${response.ask}, Bid was ${response.bid}`);
    }
    response.price = response.ask;
    return response;
  }

}

module.exports = XApiClient;

/**
 * @typedef Balance
 * @type {Object}
 * @param {number} balance balance in account currency
 * @param {number} credit credit in account currency
 * @param {?string} currency user currency  (only in getMarginLevel)
 * @param {number} equity sum of balance and all profits in account currency
 * @param {number} margin margin requirements
 * @param {number} marginFree free margin
 * @param {number} marginLevel margin level percentage
 */

/**
 * @typedef News
 * @type {Object}
 * @param {string} body Body
 * @param {string} key News key
 * @param {number} time Time (timestamp)
 * @param {string} title News title
 */

/**
 * @typedef Candle
 * @type {Object}
 * @param {number} close Close price in base currency
 * @param {number} ctm Candle start time in CET time zone (timestamp)
 * @param {string} ctmString String representation of the ctm field
 * @param {number} high Highest value in the given period in base currency
 * @param {number} low Lowest value in the given period in base currency
 * @param {number} open Open price in base currency
 * @param {?XApiClient.quoteId} quoteId Source of price (only for streaming)
 * @param {?string} symbol Symbol (only for streaming)
 * @param {number} vol Volume in lots
 */

/**
 * @typedef TickPrice
 * @type {Object}
 * @param {number} ask Ask price in base currency
 * @param {number} askVolume Number of available lots to buy at given price or null if not applicable
 * @param {number} bid Bid price in base currency
 * @param {number} bidVolume Number of available lots to buy at given price or null if not applicable
 * @param {number} high The highest price of the day in base currency
 * @param {number} level Price level
 * @param {number} low The lowest price of the day in base currency
 * @param {?XApiClient.quoteId} quoteId Source of price, detailed description below
 * @param {number} spreadRaw The difference between raw ask and bid prices
 * @param {number} spreadTable Spread representation
 * @param {string} symbol Symbol
 * @param {number} timestamp Timestamp
 */

/**
 * @typedef Trade
 * @type {Object}
 * @param {number} close_price Close price in base currency
 * @param {?number} close_time Null if order is not closed
 * @param {boolean} closed Closed
 * @param {XApiClient.command} cmd Operation code
 * @param {string} comment Comment
 * @param {?number} commission Commission in account currency, null if not applicable
 * @param {?string} customComment The value the customer may provide in order to retrieve it later.
 * @param {number} digits Number of decimal places
 * @param {?number} expiration Null if order is not closed
 * @param {number} margin_rate Margin rate
 * @param {number} offset Trailing offset
 * @param {number} open_price Open price in base currency
 * @param {number} open_time Open time
 * @param {number} order Order number for opened transaction
 * @param {number} order2 Transaction id
 * @param {number} position Position number (if type is 0 and 2) or transaction parameter (if type is 1)
 * @param {?number} profit null unless the trade is closed (type=2) or opened (type=0)
 * @param {number} sl Zero if stop loss is not set (in base currency)
 * @param {?string} state Trade state, should be used for detecting pending order's cancellation (only in streamTrades)
 * @param {number} storage Storage
 * @param {string} symbol Symbol
 * @param {number} tp Zero if take profit is not set (in base currency)
 * @param {?number} type type (only in streamTrades)
 * @param {number} volume Volume in lots
 * @param {?number} timestamp Timestamp (only in getTrades)
 */

/**
 * @typedef Profit
 * @type {Object}
 * @property {number}  order Order number
 * @property {number}  order2 Transaction ID
 * @property {number}  position Position number
 * @property {number}  profit Profit in account currency
 */

/**
 * @event XAPIConstants.STREAM_KEEP_ALIVE
 * @typedef KeepAlive
 * @type {Object}
 * @property {number} timestamp Current Timestamp
 */

/**
 * @typedef TickerSymbol
 * @type {Object}
 * @property {number} bid Bid price in base currency
 * @property {number} ask Ask price in base currency
 * @property {string} categoryName Category name
 * @property {number} contractSize Size of 1 lot
 * @property {string} currency Currency
 * @property {boolean} currencyPair Indicates whether the symbol represents a currency pair
 * @property {string} currencyProfit The currency of calculated profit
 * @property {string} description Description
 * @property {number} expiration Null if not applicable
 * @property {string} groupName Symbol group name
 * @property {number} high The highest price of the day in base currency
 * @property {number} initialMargin Initial margin for 1 lot order, used for profit/margin calculation
 * @property {number} instantMaxVolume Maximum instant volume multiplied by 100 (in lots)
 * @property {number} leverage Symbol leverage
 * @property {boolean} longOnly Long only
 * @property {number} lotMax Maximum size of trade
 * @property {number} lotMin Minimum size of trade
 * @property {number} lotStep A value of minimum step by which the size of trade can be changed (within lotMin - lotMax range)
 * @property {number} low The lowest price of the day in base currency
 * @property {number} marginHedged Used for profit calculation
 * @property {boolean} marginHedgedStrong For margin calculation
 * @property {number} marginMaintenance For margin calculation, null if not applicable
 * @property {number} marginMode For margin calculation
 * @property {number} percentage Percentage
 * @property {number} pipsPrecision Number of symbol's pip decimal places
 * @property {number} precision Number of symbol's price decimal places
 * @property {number} profitMode For profit calculation
 * @property {number} quoteId Source of price
 * @property {boolean} shortSelling Indicates whether short selling is allowed on the instrument
 * @property {number} spreadRaw The difference between raw ask and bid prices
 * @property {number} spreadTable Spread representation
 * @property {number} starting Null if not applicable
 * @property {number} stepRuleId Appropriate step rule ID from getStepRules command response
 * @property {number} stopsLevel Minimal distance (in pips) from the current price where the stopLoss/takeProfit can be set
 * @property {number} swap_rollover3days number when additional swap is accounted for weekend
 * @property {boolean} swapEnable Indicates whether swap value is added to position on end of day
 * @property {number} swapLong Swap value for long positions in pips
 * @property {number} swapShort Swap value for short positions in pips
 * @property {number} swapType Type of swap calculated
 * @property {string} symbol Symbol name
 * @property {number} tickSize Smallest possible price change, used for profit/margin calculation, null if not applicable
 * @property {number} tickValue Value of smallest possible price change (in base currency), used for profit/margin calculation, null if not applicable
 * @property {number} number Ask & bid tick number
 * @property {string} numberString number in String
 * @property {boolean} trailingEnabled Indicates whether trailing stop (offset) is applicable to the instrument.
 * @property {number} type Instrument class number
 */

/**
 * @typedef Calendar
 * @type {Object}
 * @property {string} country Two letter country code
 * @property {string} current Market value (current), empty before time of release of this value (time from "time" record)
 * @property {string} forecast Forecasted value
 * @property {string} impact Impact on market
 * @property {string} period Information period
 * @property {string} previous Value from previous information release
 * @property {time} time Time, when the information will be released (in this time empty "current" value should be changed with exact released value)
 * @property {string} title Name of the indicator for which values will be released
 */

/**
 * @typedef ChartInfoRecord
 * @type {Object}
 * @param {number} digits
 * @param {rateInfoRecord[]} rateInfos
 * @typedef rateInfoRecord
 * @type {Object}
 * @property {number} close Value of close price (shift from open price)
 * @property {number} ctm Candle start time in CET / CEST time zone (see Daylight Saving Time, DST)
 * @property {string} ctm String  String representation of the 'ctm' field
 * @property {number} high Highest value in the given period (shift from open price)
 * @property {number} low Lowest value in the given period (shift from open price)
 * @property {number} open Open price (in base currency * 10 to the power of digits)
 * @property {number} vol Volume in lots
 */

/**
 * @typedef Commission
 * @type {Object}
 * @property {number} commission calculated commission in account currency, could be null if not applicable
 * @property {?number} rateOfExchange rate of exchange between account currency and instrument base currency,
 * could be null if not applicable
 */

/**
 * @typedef UserData
 * @type {Object}
 * @property {number} companyUnit Unit the account is assigned to.
 * @property {string} currency account currency
 * @property {string} group group
 * @property {boolean} ibAccount Indicates whether this account is an IB account.
 * @property {number} leverageMultiplier The factor used for margin calculations.
 * The actual value of leverage can be calculated by dividing this value by 100.
 * @property {string} spreadType spreadType, null if not applicable
 * @property {boolean} trailingStop Indicates whether this account is enabled to use trailing stop.
 */

/**
 * @typedef IB
 * @type {Object}
 * @property {number|null} closePrice IB close price or null if not allowed to view
 * @property {string|null} login IB user login or null if not allowed to view
 * @property {number|null} nominal IB nominal or null if not allowed to view
 * @property {number|null} openPrice IB open price or null if not allowed to view
 * @property {number|null} side Operation code or null if not allowed to view
 * @property {string|null} surname IB user surname or null if not allowed to view
 * @property {string|null} symbol Symbol or null if not allowed to view
 * @property {number|null} timestamp Time the record was created or null if not allowed to view
 * @property {number|null} volume  Volume in lots or null if not allowed to view
 */

/**
 * @typedef Margin
 * @type {Object}
 * @property {number} margin
 */

/**
 * @typedef NewsTopicRecord
 * @type {Object}
 * @property {string} body Body
 * @property {number} bodylen Body length
 * @property {string} key News key
 * @property {number} time Time (timestamp)
 * @property {string} timeString Time string
 * @property {string} title News title
 */

/**
 * @typedef ProfitCalculation
 * @type {Object}
 * @property {number} profit
 */

/**
 * @typedef Order
 * @type {Object}
 * @property {number} order
 */

/**
 * @typedef TradeTransaction
 * @type {Object}
 * @property {number} cmd Operation code
 * @property {string}  customComment The value the customer may provide in order to retrieve it later.
 * @property {number}  expiration Pending order expiration time
 * @property {number}  offset Trailing offset
 * @property {number}  order 0 or position number for closing/modifications
 * @property {number}  price Trade price
 * @property {number}  sl Stop loss
 * @property {string}  symbol Trade symbol
 * @property {number}  tp Take profit
 * @property {number}  type Trade transaction type
 * @property {number}  volume Trade volume
 */

/**
 * @typedef ServerTime
 * @type {Object}
 * @property {number} timstamp Timestamp
 * @property {string} timeString Textual representation of the timestamp
 */

/**
 * @typedef StepRule
 * @type {Object}
 * @property {number} id Step rule ID
 * @property {string} name Step rule name
 * @property {Step[]} Steps
 */

/**
 * @typedef Step
 * @type {Object}
 * @property {number} fromValue Lower border of the volume range
 * @property {number} step lotStep value in the given volume range
 */

/**
 * @typedef TradingHours
 * @type {Object}
 * @property {OperatingTime[]}  quotes Quotes records
 * @property {string}  symbol Symbol
 * @property {OperatingTime[]}  trading of Trading records
 */

/**
 * @typedef OperatingTime
 * @type {Object}
 * @property {number}  day Day of week (1 = Monday, 7 = Sunday)
 * @property {number}  fromT Start time in ms from 00:00 CET / CEST (timestamp)
 * @property {number}  toT End time in ms from 00:00 CET / CEST (timestamp)
 */

/**
 * @typedef TradeStatus
 * @type {Object}
 * @property {string} customComment The value the customer may provide in order to retrieve it later.
 * @property {string} message Can be null
 * @property {number} order Unique order number
 * @property {number} price Price in base currency
 * @property {number} requestStatus Request status code, described below
 */

/**
 * @typedef Error
 * @type {Object}
 * @property {string} code
 * @property {string} message
 */
 