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

const XAPIConstants = require('./xapi_constants');
const TLS = require('tls');
const {once, on, EventEmitter} = require('events');

/**
 * Javascript Implementation of the API to call remote operations on the XTB/X Open Hub xStation 5 platform
 * @version 2.5.0
 * @see http://developers.xstore.pro/documentation/2.5.0
 * @extends {EventEmitter}
 * @todo define a maximum amount of messages/s that can go in a single  streaming socket and then have the sockets identify if a new one must be opened
 * @todo have an internal event emitter and remove the public events. Streaming methods become async generators
 */
let xapiClientClass = class extends EventEmitter {
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
    this.#tcpPort = (isDemo) ?
        XAPIConstants.DEMO_TCP_PORT :
        XAPIConstants.LIVE_TCP_PORT;
    this.#pubSubPort = (isDemo) ?
        XAPIConstants.DEMO_STREAM_PORT :
        XAPIConstants.LIVE_STREAM_PORT;
    this.#sockets = new Map();
    this.#data = new WeakMap();
    this._connectSocket('synchronous', this.#tcpPort);
    this.login();
  }

  _checkLoggedIn() {
    if (!this.isLoggedIn) {
      throw new Error('Not logged in');
    }
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
   * handle can take care of it
   * @param {string} rcvd message
   * @param {TLSSocket} socket socket which received the message
   */
  _parseResponse(rcvd, socket) {
    const response = this.#data.get(socket) + rcvd;
    //API messages are always terminated with two newlines
    if (rcvd.substring(-2) === '\n\n') {
      this.#data.set(socket, response);
      return;
    }
    this.#data.set(socket, '');
    let responseObj = JSON.parse(response);
    const tag = responseObj.customTag;
    if (!responseObj.success) {
      console.log(
          'Error: ' + responseObj.errorCode + ' ' + responseObj.errorDescr);
      this.emit(responseObj.customTag, responseObj);
    } else {
      this.emit(responseObj.customTag, responseObj.returnData);
    }
  }

  /**
   * generic method that sends a message to the server and (asynchronously) waits for a reply
   * @param {string} operationName
   * @param {string} customTag
   * @param {object} args the operation parameters
   * */
  async _callSyncOperation(operationName, customTag, args = {}) {
    this._checkLoggedIn();
    let payload = {command: operationName, customTag: customTag};
    if (Object.keys(args).length !== 0 || args.constructor !== Object) {
      payload.arguments = args;
    }
    this.#sockets.get('synchronous').write(JSON.stringify(payload));
    const [response] = await once(this, customTag);
    return response;
  }

  /**
   * Returns array of all symbols available for the user.
   * @return {Promise<TickerSymbol[]>}
   */
  getAllSymbols() {
    return this._callSyncOperation('getAllSymbols', XAPIConstants.ALL_SYMBOLS);
  }

  /**
   * Returns calendar with market events.
   * @returns {Promise<CalendarRecord[]>}
   */
  getCalendar() {
    return this._callSyncOperation('getCalendar', XAPIConstants.CALENDAR);
  }

  /**
   * Returns chart info, from start date to the current time.
   * @param {XAPIConstants#PERIOD} period
   * @param {number} start
   * @param {string} symbol
   * @returns {Promise<ChartInfoRecord>}
   * @see http://developers.xstore.pro/documentation/#getChartLastRequest
   * @deprecated streamGetCandles is the preferred way of retrieving current candle data.
   */
  getChartLastRequest(period, start, symbol) {
    return this._callSyncOperation('getCalendar',
        XAPIConstants.CHART_LAST_REQUEST,
        {period: period, start: start, symbol: symbol});
  }

  /**
   * Returns chart info with data between given start and end dates.
   * If ticks is not set or value is 0, valid start and end time must be specified
   * If ticks >0 (e.g. N) then API returns N candles AFTER start. end is ignored
   * If ticks <0 then API returns N candles BEFORE start. end is ignored
   * @param {number} start timestamp
   * @param {number} end timestamp
   * @param {XAPIConstants#PERIOD} period
   * @param {String}symbol
   * @param {number} ticks
   * @returns {Promise<ChartInfoRecord>}
   * @see http://developers.xstore.pro/documentation/#getChartRangeRequest
   * @deprecated  streamGetCandles is the preferred way of retrieving current candle data.
   */
  getChartRangeRequest(start, end, period, symbol, ticks = 0) {
    return this._callSyncOperation('getChartRangeRequest',
        XAPIConstants.CHART_RANGE_REQUEST,
        {start: start, end: end, period: period, symbol: symbol, ticks: ticks});
  }

  /**
   * In order to perform any action client applications have to perform login process.
   * No functionality is available before a successful login.
   * After initial login, a new session is created and all commands can executed by an authenticated
   * user until he/she logs out or drops the connection.
   */
  login() {
    let payload = {
      command: 'login', arguments: {
        userId: this.#username, password: this.#password,
      }, customTag: XAPIConstants.LOGIN,
    };
    this.#sockets.get('synchronous').write(JSON.stringify(payload));

    once(this, XAPIConstants.LOGIN).then(([loginResponse]) => {
      if (!loginResponse.status) {
        throw new Error('Could not login');
      }
      this.isLoggedIn = true;
      this.#streamSessionId = loginResponse.streamSessionId;
    });
  }

  stopStreamBalance() {
    this._checkLoggedIn();
    let payload = {
      command: 'stopBalance', streamSessionId: this.#streamSessionId,
    };
    this.#sockets.get(XAPIConstants.STREAM_BALANCE).
        write(JSON.stringify(payload));
  }

  stopStreamGetCandles(symbol) {
    let payload = {
      command: 'stopCandles',
      symbol: symbol,
      streamSessionId: this.#streamSessionId,
    };
    this.#sockets.get(XAPIConstants.STREAM_CANDLES).
        write(JSON.stringify(payload));
  }

  stopStreamGetNews() {
    let payload = {
      command: 'stopNews', streamSessionId: this.#streamSessionId,
    };
    this.#sockets.get(XAPIConstants.STREAM_NEWS).write(JSON.stringify(payload));
  }

  stopStreamGetProfits() {
    let payload = {
      command: 'stopProfits', streamSessionId: this.#streamSessionId,
    };
    this.#sockets.get(XAPIConstants.STREAM_PROFITS).
        write(JSON.stringify(payload));
  }

  stopStreamGetTickPrices(symbol) {
    let payload = {
      command: 'stopTickPrices',
      symbol: symbol,
      streamSessionId: this.#streamSessionId,
    };
    this.#sockets.get(XAPIConstants.STREAM_TICK_PRICES).
        write(JSON.stringify(payload));
  }

  stopStreamGetTradeStatus(symbol) {
    let payload = {
      command: 'stopTradeStatus',
      symbol: symbol,
      streamSessionId: this.#streamSessionId,
    };
    this.#sockets.get(XAPIConstants.STREAM_TRADE_STATUS).
        write(JSON.stringify(payload));
  }

  stopStreamGetTrades(symbol) {
    let payload = {
      command: 'stopTrades',
      symbol: symbol,
      streamSessionId: this.#streamSessionId,
    };
    this.#sockets.get(XAPIConstants.STREAM_TRADES).
        write(JSON.stringify(payload));
  }

  stopStreamKeepAlive() {
    let payload = {
      command: 'stopKeepAlive', streamSessionId: this.#streamSessionId,
    };
    this.#sockets.get(XAPIConstants.STREAM_KEEP_ALIVE).
        write(JSON.stringify(payload));
  }

  /**
   * Allows to get actual account indicators values in real-time, as soon as they are available in the system.
   * @fires XAPIConstants#STREAM_BALANCE
   */
  streamGetBalance() {
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
   * @fires XAPIConstants#STREAM_CANDLES
   */
  streamGetCandles(symbol) {
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
   * Subscribes to news.
   * @fires XAPIConstants#STREAM_NEWS
   */
  streamGetNews() {
    let payload = {
      command: 'getNews',
      streamSessionId: this.#streamSessionId,
      customTag: XAPIConstants.STREAM_NEWS,
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
   * @fires XAPIConstants#STREAM_TICK_PRICES
   */
  streamGetTickPrices(symbol, {minArrivalTime = 0, maxLevel}) {
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
   * @fires XAPIConstants#STREAM_TRADE_STATUS
   */
  streamGetTradeStatus() {
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
   * @see http://developers.xstore.pro/documentation/2.5.0#streamgetTrades
   * @fires XAPIConstants#STREAM_TRADES
   */
  streamGetTrades() {
    let payload = {
      command: 'getTrades',
      streamSessionId: this.#streamSessionId,
      customTag: XAPIConstants.STREAM_TRADES,
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
      command: 'keepAlive',
      streamSessionId: this.#streamSessionId,
      customTag: XAPIConstants.STREAM_KEEP_ALIVE,
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
      command: 'ping',
      streamSessionId: this.#streamSessionId,
      customTag: XAPIConstants.STREAM_PING,
    };
    const ownSocket = this._connectSocket(XAPIConstants.STREAM_PING);
    ownSocket.write(JSON.stringify(payload));
    ownSocket.destroy();
  }

  /**
   * Returns calculation of commission and rate of exchange.
   * The value is calculated as expected value, and therefore might
   * not be perfectly accurate.
   * @param {string} tickerSymbol
   * @param {number} volume
   * @returns {Promise<CommissionData>}
   */
  getCommissionDef(tickerSymbol, volume) {
    return this._callSyncOperation('getCommissionDef',
        XAPIConstants.COMMISSION_DEF, {symbol: tickerSymbol, volume: volume});
  }

  /**
   * Returns information about account currency, and account leverage
   * for the current API user
   * @returns {Promise<UserDataRecord>}
   */
  getCurrentUserData() {
    return this._callSyncOperation('getCurrentUserData',
        XAPIConstants.CURRENT_USER_DATA);
  }

  /**
   * Returns IBs data from the given time range.
   * @param {number} start (timestamp) Start of IBs history block
   * @param {number} end (timestamp) End of IBs history block
   * @returns {Promise<IBRecord[]>}
   */
  getIbsHistory(start, end) {
    return this._callSyncOperation('getIbsHistory', XAPIConstants.IBS_HISTORY,
        {end: end, start: start});
  }

  /**
   * Returns various account indicator
   * @returns {Promise<MarginLevelRecord>}
   * @deprecated streamGetBalance is the preferred way of retrieving account
   * indicators.
   */
  getMarginLevel() {
    return this._callSyncOperation('getMarginLevel',
        XAPIConstants.MARGIN_LEVEL);
  }

  /**
   * Returns expected margin for given instrument and volume.
   * The value is calculated as expected margin value, and therefore might not
   * be perfectly accurate.
   * @param symbol
   * @param volume
   * @returns {Promise<MarginRecord>}
   */
  getMarginTrade(symbol, volume) {
    return this._callSyncOperation('getMarginLevel', XAPIConstants.MARGIN_LEVEL,
        {symbol: symbol, volume: volume});
  }

  /**
   * Returns news from trading server which were sent within specified period
   * of time.
   * @param {number} start (timestamp)
   * @param {number} end (timestamp)
   * @returns {Promise<NewsTopicRecord[]>}
   * @deprecated streamGetNews is the preferred way of retrieving news data.
   */
  getNews(start, end) {
    return this._callSyncOperation('getMarginLevel', XAPIConstants.MARGIN_LEVEL,
        {symbol: symbol, volume: volume});
  }

  /**
   * Calculates estimated profit for given deal data Should be used for
   * calculator-like apps only. Profit for opened transactions should be
   * taken from server, due to higher precision of server calculation.
   * @param {XAPIConstants#COMMAND} cmd Operation code
   * @param {string} symbol symbol
   * @param {number} volume volume
   * @param {number} closePrice theoretical close price of order
   * @param {number} openPrice theoretical open price of order
   * @returns {Promise<ProfitCalculation>}
   */
  getProfitCalculation(cmd, symbol, volume, openPrice, closePrice) {
    return this._callSyncOperation('getProfitCalculation',
        XAPIConstants.PROFIT_CALCULATION, {
          cmd: cmd,
          symbol: symbol,
          volume: volume,
          openPrice: openPrice,
          closePrice: closePrice,
        });
  }

  /**
   * Returns current time on trading server.
   * @returns {Promise<ServerTime>}
   */
  getServerTime() {
    return this._callSyncOperation('getServerTime', XAPIConstants.SERVER_TIME);
  }

  /**
   * Returns a list of step rules for DMAs
   * @returns {Promise<StepRule[]>}
   */
  getStepRules() {
    return this._callSyncOperation('getStepRules', XAPIConstants.STEP_RULES);
  }

  /**
   * Returns information about symbol available for the user.
   * @returns {Promise<TickerSymbol>}
   */
  getSymbol() {
    return this._callSyncOperation('getSymbol', XAPIConstants.SYMBOL);
  }

  /**
   * Returns array of current quotations for given symbols, only quotations that
   * changed from given timestamp are returned. New timestamp obtained from
   * output will be used as an argument of the next call of this command.
   * @param {number} level price level
   * @param {string[]} symbols Array of symbol names
   * @param {number} timestamp The time from which the most recent tick should
   * be looked for. Historical prices cannot be obtained using this parameter.
   * It can only be used to verify whether a price has changed since the given
   * time.
   * @returns {Promise<TickPrice[]>}
   * @see http://developers.xstore.pro/documentation/#getTickPrices
   * @deprecated streamGetTickPrices is the preferred way of retrieving ticks
   * data.
   */
  getTickPrices(level, symbols, timestamp) {
    return this._callSyncOperation('getTickPrices', XAPIConstants.TICK_PRICES,
        {level: level, symbols: symbols, timestamp: timestamp});
  }

  /**
   * Returns array of trades listed in orders argument.
   * @param {number[]} orders Array of orders (position numbers)
   * @returns {Promise<Trade[]>}
   */
  getTradeRecords(orders) {
    return this._callSyncOperation('getTradeRecords',
        XAPIConstants.TRADE_RECORDS, {orders: orders});
  }

  /**
   * Returns array of user's trades
   * @param {boolean} openedOnly if true then only open trades will be returned
   * @returns {Promise<Trade[]>}
   * @deprecated streamGetTrades is the preferred way of retrieving trades data.
   */
  getTrades(openedOnly) {
    return this._callSyncOperation('getTrades', XAPIConstants.TRADES,
        {openedOnly: openedOnly});
  }

  /**
   * Returns array of user's trades which were closed within specified period
   * of time.
   * @param {number} start (timestamp)
   * @param {number} end (timestamp)
   * @returns {Promise<Trade[]>}
   * @deprecated streamGetTrades is the preferred way of retrieving trades data.
   */
  getTradesHistory(start, end) {
    return this._callSyncOperation('getTradesHistory',
        XAPIConstants.TRADES_HISTORY, {start: start, end: end});
  }

  /**
   * Returns quotes and trading times.
   * @param {string[]} symbols
   * @returns {Promise<TradingHours[]>}
   */
  getTradingHours(symbols) {
    return this._callSyncOperation('getTradingHours',
        XAPIConstants.TRADING_HOURS);
  }

  /**
   * Returns the current API version.
   * @returns {Promise<Version>}
   */
  getVersion() {
    return this._callSyncOperation('getVersion', XAPIConstants.VERSION);
  }

  ping() {
    return this._callSyncOperation('ping', XAPIConstants.PING);
  }

  /**
   * Starts trade transaction. tradeTransaction sends main transaction
   * information to the server.
   * @param {XAPIConstants.COMMAND} cmd Operation code
   * @param {string} customComment The value the customer may provide in order to retrieve it later.
   * @param {number} expiration Pending order expiration time (timestamp)
   * @param {number} offset Trailing offset
   * @param {number} order 0 or position number for closing/modifications
   * @param {number} price Trade price
   * @param {number} sl Stop loss
   * @param {string} symbol Trade symbol
   * @param {number} tp Take profit
   * @param {XAPIConstants.TRADE_TYPES} type Trade transaction type
   * @param {number} volume Trade volume
   * @returns {Promise<Order>}
   */
  tradeTransaction(cmd, customComment, expiration, offset, order, price, sl,
                   symbol, tp, type, volume) {
    return this._callSyncOperation('tradeTransaction',
        XAPIConstants.TRADE_TRANSACTION, {
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
   * @param {number} order  order number from tradeTransaction
   * @returns {Promise<TradeTransactionx>}
   * @deprecated streamGetTradeStatus is the preferred way of retrieving transaction status data.
   */
  tradeTransactionStatus(order) {
    return this._callSyncOperation('tradeTransactionStatus',
        XAPIConstants.TRADE_TRANSACTION_STATUS, {order: order});
  }

};

module.exports = xapiClientClass;

/**
 * @typedef XAPIConstants#LOGIN
 * @type {object}
 * @property {boolean} status
 * @property {string} streamSessionId
 */

/**
 * Balance Message
 * @event XAPIConstants#STREAM_BALANCE
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
 * @type {object}
 * @property {string}  body Body
 * @property {string}  key News key
 * @property {number}  time Time
 * @property {string}  title News title
 */

/**
 * Streaming Profit Record
 * @event XAPIConstants#STREAM_PROFITS
 * @type {object}
 * @property {number}  order Order number
 * @property {number}  order2 Transaction ID
 * @property {number}  position Position number
 * @property {number}  profit Profit in account currency
 */

/**
 * @event XAPIConstants#STREAM_TICK_PRICES
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
 * @property {XAPIConstants#COMMAND} cmd Operation code
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
 * @property {XAPIConstants#TRADE_TYPES} type type
 * @property {number} volume Volume in lots
 */

/**
 * Streaming Keep Alive Record
 * @event XAPIConstants#STREAM_KEEP_ALIVE
 * @typedef XAPIConstants#STREAM_KEEP_ALIVE
 * @type {object}
 * @property {number} timestamp Current Timestamp
 *
 */

/**
 * @typedef TickerSymbol
 * @type {object}
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
 * @typedef CalendarRecord
 * @type {object}
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
 * @type {object}
 * @param {number} digits
 * @param {rateInfoRecord[]} rateInfos
 * @typedef rateInfoRecord
 * @type {object}
 * @property {number} close Value of close price (shift from open price)
 * @property {number} ctm Candle start time in CET / CEST time zone (see Daylight Saving Time, DST)
 * @property {string} ctm String  String representation of the 'ctm' field
 * @property {number} high Highest value in the given period (shift from open price)
 * @property {number} low Lowest value in the given period (shift from open price)
 * @property {number} open Open price (in base currency * 10 to the power of digits)
 * @property {number} vol Volume in lots
 */

/**
 * @typedef CommissionData
 * @type {object}
 *  @property {number} commission calculated commission in account currency, could be null if not applicable
 *  @property {number} rateOfExchange rate of exchange between account currency and instrument base currency, could be null if not applicable
 */

/**
 * @typedef UserDataRecord
 * @type {object}
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
 * @typedef IBRecord
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
 * @typedef MarginLevelRecord
 * @type {object}
 * @property {number} balance balance in account currency
 * @property {number} credit credit
 * @property {string} currency user currency
 * @property {number} equity sum of balance and all profits in account currency
 * @property {number} margin margin requirements in account currency
 * @property {number} margin_free free margin in account currency
 * @property {number} margin_level margin level percentage
 */

/**
 * @typedef MarginRecord
 * @type {object}
 * @property {number} margin
 */

/**
 * @typedef NewsTopicRecord
 * @type {object}
 * @property {string} body Body
 * @property {number} bodylen Body length
 * @property {string} key News key
 * @property {number} time Time (timestamp)
 * @property {string} timeString Time string
 * @property {string} title News title
 */

/**
 * @typedef
 * @type {object}

 */

/**
 * @typedef
 * @type {object}

 */

/**
 * @typedef
 * @type {object}

 */

/**
 * @typedef
 * @type {object}

 */

/**
 * @typedef
 * @type {object}

 */

/**
 * @typedef
 * @type {object}

 */

/**
 * @typedef
 * @type {object}

 */

/**
 * @typedef
 * @type {object}

 */

/**
 * @typedef
 * @type {object}

 */

/**
 * @typedef
 * @type {object}

 */

/**
 * @typedef
 * @type {object}

 */

/**
 * @typedef
 * @type {object}

 */

/**
 * @typedef
 * @type {object}

 */

/**
 * @typedef
 * @type {object}

 */

