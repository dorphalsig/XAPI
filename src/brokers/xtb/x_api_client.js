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

import EventTarget2 from 'src/events/events';
import config from './config';
import XAPIConstants from './xapi_constants';

/**
 * Javascript Implementation of the API to call remote operations on the XTB/X
 * Open Hub xStation 5 platform
 * @version 2.5.0
 * @see http://developers.xstore.pro/documentation/2.5.0
 * @todo define a maximum amount of messages/s that can go in a single
 *     streaming socket and then have the sockets identify if a new one must be
 *     opened
 */
class XApiClient {
  /**
   * @readonly
   * @enum {number}
   */
  static Period = Object.freeze({
    /** 1 minute */
    PERIOD_M1: 1,
    /** 5 minutes */
    PERIOD_M5: 5,
    /** 15 minutes */
    PERIOD_M15: 15,
    /** 30 minutes */
    PERIOD_M30: 30,
    /** 1 hour */
    PERIOD_H1: 60,
    /** 4 hours */
    PERIOD_H4: 240,
    /** 1 day */
    PERIOD_D1: 1440,
    /** 1 week */
    PERIOD_W1: 10080,
    /** 30 days */
    PERIOD_MN1: 43200,
  });
  /**
   * @readonly
   * @enum {number}
   */
  static command = Object.freeze({
    BUY: 0,
    SELL: 1,
    BUY_LIMIT: 2,
    SELL_LIMIT: 3,
    BUY_STOP: 4,
    SELL_STOP: 5,
    BALANCE: 6,
    CREDIT: 7,
  });
  /**
   * @readonly
   * @enum {number}
   */
  static quoteId = Object.freeze({FIXED: 1, FLOAT: 2, DEPTH: 3, CROSS: 4});
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
   * return {Promise<Balance>}
   * indicators.
   */
  /** @type {boolean} */
  isLoggedIn = false;
  /** @type {WeakMap<WebSocket,string>} */
  #data;
  /**
   * @type EventTarget2
   */
  #emitter;
  /** @type {string} */
  #password;
  /** @type {string} */
  #endpoint;
  /** @type {string} */
  #streamEndpoint;
  /** @type {Map<String,WebSocket>} */
  #sockets;
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
  constructor(username, password, isDemo) {
    this.#username = username;
    this.#password = password;
    this.#emitter = new EventTarget2();
    this.#endpoint = (isDemo) ? config.DEMO_ENDPOINT : config.LIVE_ENDPOINT;
    this.#streamEndpoint = (isDemo) ? config.DEMO_ENDPOINT_STREAM :
        config.LIVE_ENDPOINT_STREAM;
    this.#sockets = new Map();
    this.#data = new WeakMap();
  }

  /**
   * generic method that sends a message to the server and (asynchronously)
   * waits for a reply
   * @param {string} customTag
   * @param {string} operationName
   * @param {Object} args the operation parameters
   * @return {Object}
   * @private
   * */
  async _callOperation(customTag, operationName, args = {}) {
    this._checkLoggedIn();
    const payload = {command: operationName, customTag: customTag};
    if (Object.keys(args).length !== 0 || args.constructor !== Object) {
      payload.arguments = args;
    }
    this.#sockets.get('operation').write(JSON.stringify(payload));
    return (await this.#emitter.once(operationName)).detail;
  }

  /**
   * checks if a user is logged in, throws error if not
   * @private
   */
  _checkLoggedIn() {
    if (!this.isLoggedIn) {
      throw new Error('Not logged in');
    }
  }

  /**
   * opens a socket and connects to the XTB/ XOpen Hub Server
   * @param  {string} name the name of the socket, this will be used to route
   * the async messages. Basically each streaming message has its own dedicated
   *     socket
   * @param {string} endpoint WSS endpoint
   * @return {WebSocket}
   * @private
   */
  _connectSocket(name, endpoint = this.#endpoint) {
    if (this.#sockets.has(name)) {
      console.log(`socket ${name} already exists. Doing nothing`);
      return this.#sockets.get(name);
    }
    const socket = new WebSocket(endpoint);

    socket.onclose = (function(closeEvent) {
      console.log(`Socket ${name} disconnected`);
      if (closeEvent.code !== 1000) {
        throw new Error(
            'The server unexpectedly closed the connection.' +
            `Error code ${closeEvent.code}. More info can be found in` +
            'https://www.iana.org/assignments/websocket/websocket.xml#close-code-number');
      }
      const socket = closeEvent.currentTarget;
      this.#sockets.delete(name);
      this.#data.delete(socket);
    }).bind(this);

    socket.onmessage = (function(messageEvent) {
      this._parseResponse(messageEvent.data, messageEvent.source);
    }).bind(this);

    this.#sockets.set(name, socket);
    this.#data.set(socket, '');
    return socket;
  }

  /**
   * parses the response and publishes an event so the corresponding
   * handler can take care of it
   * @param {string} rcvd message
   * @param {WebSocket} socket socket which received the message
   * @private
   */
  _parseResponse(rcvd, socket) {
    const responses = (this.#data.get(socket) + rcvd).trim().split('\n\n');
    // API messages are always terminated with two newlines
    const remainder = (rcvd.lastIndexOf('\n\n') === rcvd.length - 2) ? '' :
        responses.pop();
    this.#data.set(socket, remainder);

    for (const response of responses) {
      const responseObj = JSON.parse(response);
      if (responseObj.status) {
        const returnData = responseObj.customTag === XAPIConstants.LOGIN ?
            responseObj.streamSessionId : responseObj.returnData;
        this.#emitter.dispatchEvent(
            new CustomEvent(responseObj.customTag, {detail: returnData}));
        continue;
      }
      this.#emitter.dispatchEvent(
          new CustomEvent(XAPIConstants.ERROR_PREFIX + responseObj.customTag,
              {detail: responseObj}));
      console.warn(`Call with customTag ${responseObj.customTag}` +
          `Failed: ${responseObj.errorDescr} (code: ${responseObj.errorCode})`);
    }
  }

  /**
   *
   * @param {object} chartInfo
   * @param {string} symbol
   * @return {Candle[]}
   * @private
   */
  _processChartRequest(chartInfo, symbol) {
    const candles = [];
    for (const response of chartInfo.rateInfos) {
      response.symbol = symbol;
      response.close = response.close / (10 ** chartInfo.digits);
      response.open = response.open / (10 ** chartInfo.digits);
      response.high = response.high / (10 ** chartInfo.digits);
      response.low = response.low / (10 ** chartInfo.digits);
      candles.push(response);
    }
    return candles;
  }

  /**
   * generic method to stop streaming a command
   * @param {string} customTag
   * @param {string} stopCommand
   * @param {object} args
   * @return {boolean}
   * @private
   */
  _stopStreaming(customTag, stopCommand, args = {}) {
    if (!this.#sockets.has(customTag)) {
      return false;
    }
    this.#emitter.off(customTag);
    const socket = this.#sockets.get(customTag);
    const payload = {
      command: stopCommand,
      streamSessionId: this.#streamSessionId,
    };
    if (Object.keys(args).length > 0) {
      Object.assign(payload, args);
    }
    socket.write(JSON.stringify(payload));
    socket.close();
    this.#sockets.delete(customTag);
    return true;
  }

  /**
   * opens a socket and subscribes to a specific stream yielding its result
   * when the subscription is cancelled (see _stopStreaming) it closes the
   * socket
   * @param {string} customTag
   * @param {string} command
   * @param {Object} args the operation parameters
   * @return {boolean} false if there is an already active subscription,
   * true once its finished
   * @private
   */
  async* _streamOperation(customTag, command, args = {}) {
    this._checkLoggedIn();

    if (this.#sockets.has(customTag)) {
      return false;
    }
    const socket = this._connectSocket(customTag, this.#streamEndpoint);
    this.#sockets.set(customTag, socket);
    const payload = {command: command, customTag: customTag};
    if (Object.keys(args).length !== 0 || args.constructor !== Object) {
      Object.assign(payload, args);
    }
    socket.write(JSON.stringify(payload));
    for await(let triggeredEvent of this.#emitter.on(customTag)) {
      yield triggeredEvent.detail;
    }
    return true;
  }

  /**
   * Returns array of all symbols available for the user.
   * @return {Promise<TickerSymbol[]>}
   */
  getAllSymbols() {
    return this._callOperation(XAPIConstants.ALL_SYMBOLS, 'getAllSymbols');
  }

  /**
   * Returns calendar with market events.
   * @return {Promise<Calendar[]>}
   */
  getCalendar() {
    return this._callOperation(XAPIConstants.CALENDAR, 'getCalendar');
  }

  /**
   * Returns chart info, from start date to the current time.
   * Note: streamCandles is the preferred way of retrieving current candle data.
   * @param {XApiClient.Period} period
   * @param {number} start
   * @param {string} symbol
   * return {Promise<Candle[]>}
   * @see http://developers.xstore.pro/documentation/#getChartLastRequest
   */
  async getChartLastRequest(period, start, symbol) {
    const chartInfo = await this._callOperation(
        XAPIConstants.CHART_LAST_REQUEST, 'getCalendar',
        {info: {period: period, start: start, symbol: symbol}});
    return this._processChartRequest(chartInfo, symbol);
  }

  /**
   * Returns chart info with data between given start and end dates.
   * If ticks is not set or value is 0, valid start and end time must be
   * specified If ticks >0 (e.g. N) then API returns N candles AFTER start. end
   * is ignored If ticks <0 then API returns N candles BEFORE start. end is
   * ignored
   *
   * Note: streamCandles is the preferred way of retrieving current candle
   * data.
   * @param {number} start timestamp
   * @param {number} end timestamp
   * @param {XApiClient.Period} period
   * @param {string} symbol
   * @param {number} ticks
   * @return {Promise<Candle[]>}
   * @see http://developers.xstore.pro/documentation/#getChartRangeRequest
   */
  async getChartRangeRequest(start, end, period, symbol, ticks = 0) {
    const chartInfo = await this._callOperation(
        XAPIConstants.CHART_RANGE_REQUEST, 'getChartRangeRequest',
        {
          info: {
            start: start,
            end: end,
            period: period,
            symbol: symbol,
            ticks: ticks,
          },
        });
    return this._processChartRequest(chartInfo, symbol);
  }

  /**
   * Returns calculation of commission and rate of exchange.
   * The value is calculated as expected value, and therefore might not be
   * perfectly accurate.
   * @param {string} tickerSymbol
   * @param {number} volume
   * @return {Promise<Commission>}
   */
  getCommissionDef(tickerSymbol, volume) {
    return this._callOperation(XAPIConstants.COMMISSION_DEF, 'getCommissionDef',
        {symbol: tickerSymbol, volume: volume});
  }

  /**
   * Returns information about account currency, and account leverage
   * for the current API user
   * @return {Promise<UserData>}
   */
  getCurrentUserData() {
    return this._callOperation(XAPIConstants.CURRENT_USER_DATA,
        'getCurrentUserData');
  }

  /**
   * Returns IBs data from the given time range.
   * @param {number} start (timestamp) Start of IBs history block
   * @param {number} end (timestamp) End of IBs history block
   * @return {Promise<IB[]>}
   */
  getIbsHistory(start, end) {
    return this._callOperation(XAPIConstants.IBS_HISTORY, 'getIbsHistory',
        {end: end, start: start});
  }

  /**
   * Returns various account indicators
   * streamBalance is the preferred way of retrieving account indicators
   * @return {Promise<Balance>}
   */
  getMarginLevel() {
    const result = this._callOperation(XAPIConstants.MARGIN_LEVEL,
        'getMarginLevel');
    result.marginFree = result.margin_free;
    result.marginLevel = result.margin_level;
    return result;
  }

  /**
   * Returns expected margin for given instrument and volume.
   * The value is calculated as expected margin value, and therefore might not
   * be perfectly accurate.
   * @param {string} symbol
   * @param {number} volume
   * @return {Promise<Margin>}
   */
  getMarginTrade(symbol, volume) {
    return this._callOperation(XAPIConstants.MARGIN_TRADE, 'getMarginTrade',
        {symbol: symbol, volume: volume});
  }

  /**
   * Returns news from trading server which were sent within specified Period
   * of time.
   * Note: streamNews is the preferred way of retrieving news data.
   * @param {number} start (timestamp)
   * @param {number} end (timestamp)
   * @return {Promise<News[]>}
   */
  getNews(start, end) {
    return this._callOperation(XAPIConstants.NEWS, 'getNews',
        {start: start, end: end});
  }

  /**
   * Calculates estimated profit for given deal data Should be used for
   * calculator-like apps only. Profit for opened transactions should be
   * taken from server, due to higher precision of server calculation.
   * @param {XApiClient.command} cmd Operation code
   * @param {string} symbol symbol
   * @param {number} volume volume
   * @param {number} openPrice theoretical open price of order*
   * @param {number} closePrice theoretical close price of order
   * @return {Promise<ProfitCalculation>}
   */
  getProfitCalculation(cmd, symbol, volume, openPrice, closePrice) {
    return this._callOperation(XAPIConstants.PROFIT_CALCULATION,
        'getProfitCalculation', {
          cmd: cmd,
          symbol: symbol,
          volume: volume,
          openPrice: openPrice,
          closePrice: closePrice,
        });
  }

  /**
   * Returns current time on trading server.
   * @return {Promise<ServerTime>}
   */
  getServerTime() {
    return this._callOperation(XAPIConstants.SERVER_TIME, 'getServerTime');
  }

  /**
   * Returns a list of step rules for DMAs
   * @return {Promise<StepRule[]>}
   */
  getStepRules() {
    return this._callOperation(XAPIConstants.STEP_RULES, 'getStepRules');
  }

  /**
   * Returns information about symbol available for the user.
   * @return {Promise<TickerSymbol>}
   */
  getSymbol() {
    return this._callOperation(XAPIConstants.SYMBOL, 'getSymbol');
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
   * @return {Promise<TickPrice[]>}
   * @see http://developers.xstore.pro/documentation/#getTickPrices
   */
  getTickPrices(level, symbols, timestamp) {
    return this._callOperation(XAPIConstants.TICK_PRICES, 'getTickPrices',
        {level: level, symbols: symbols, timestamp: timestamp});
  }

  /**
   * Returns array of trades listed in orders argument.
   * @param {number[]} orders Array of orders (position numbers)
   * @return {Promise<Trade[]>}
   */
  getTradeRecords(orders) {
    return this._callOperation(XAPIConstants.TRADE_RECORDS,
        'getTradeRecords',
        {orders: orders});
  }

  /**
   * Returns array of user's trades
   * Note: streamTrades is the preferred way of retrieving trades data.
   * @param {boolean} openedOnly if true then only open trades will be returned
   * @return {Promise<Trade[]>}
   */
  getTrades(openedOnly) {
    return this._callOperation(XAPIConstants.TRADES, 'getTrades',
        {openedOnly: openedOnly});
  }

  /**
   * Returns array of user's trades which were closed within specified Period
   * of time.
   * Note: streamTrades is the preferred way of retrieving trades data.
   * @param {number} start (timestamp)
   * @param {number} end (timestamp)
   * @return {Promise<Trade[]>}
   */
  getTradesHistory(start, end) {
    return this._callOperation(XAPIConstants.TRADES_HISTORY, 'getTradesHistory',
        {start: start, end: end});
  }

  /**
   * Returns quotes and trading times.
   * @param {string[]} symbols
   * @return {Promise<TradingHours[]>}
   */
  getTradingHours(symbols) {
    return this._callOperation(XAPIConstants.TRADING_HOURS, 'getTradingHours',
        {symbols: symbols});
  }

  /**
   * Returns the current API version.
   * @return {Promise<Version>}
   */
  getVersion() {
    return this._callOperation(XAPIConstants.VERSION, 'getVersion');
  }

  /**
   * In order to perform any action client applications have to perform login
   * process. No functionality is available before a successful login. After
   * initial login, a new session is created and all commands can executed by
   * an authenticated user until he/she logs out or drops the connection.
   */
  async login() {
    const errorEventName = XAPIConstants.ERROR_PREFIX + XAPIConstants.LOGIN;
    this._connectSocket('operation', this.#endpoint);
    this.#emitter.once(errorEventName, (response) => {
      throw new Error(
          `Could not log in: ${response.errorDescr} (${response.errorCode})`);
    });

    const payload = {
      command: 'login', arguments: {
        userId: this.#username, password: this.#password,
      }, customTag: XAPIConstants.LOGIN,
    };

    this.#sockets.get('operation').write(JSON.stringify(payload));

    this.#streamSessionId = (await this.#emitter.once(
        XAPIConstants.LOGIN)).detail;
    this.isLoggedIn = true;
    return true;
  }

  /**
   * logs out and closes all the sockets
   */
  logout() {
    this._callOperation(XAPIConstants.LOGOUT, 'logout');
    this.isLoggedIn = false;
    this.#sockets.forEach((socket, key) => {
      socket.close();
      this.#sockets.delete(key);
    });
    this.#streamSessionId = undefined;
  }

  /**
   * Regularly calling this function is enough to refresh the internal state of
   * all the components in the system. It is recommended that any application
   * that does not execute other commands, should call this command at least
   * once every 10 minutes.
   */
  ping() {
    this._callOperation(XAPIConstants.PING, 'ping');
  }

  /**
   * stops streaming Balance
   */
  stopStreamBalance() {
    this._stopStreaming(XAPIConstants.STREAM_BALANCE, 'stopBalance');
  }

  /**
   * stops streaming candles for the specified symbol
   * @param {string} symbol
   */
  stopStreamCandles(symbol) {
    this._stopStreaming(XAPIConstants.STREAM_CANDLES, 'stopCandles');
  }

  /**
   * stops streaming Keep-Alive
   */
  stopStreamKeepAlive() {
    this._stopStreaming(XAPIConstants.STREAM_KEEP_ALIVE, 'stopKeepAlive');
  }

  /**
   * stops streaming News
   */
  stopStreamNews() {
    this._stopStreaming(XAPIConstants.STREAM_NEWS, 'stopNews');
  }

  /**
   * stops streaming Profits
   */
  stopStreamProfits() {
    this._stopStreaming(XAPIConstants.STREAM_PROFITS, 'stopProfits');
  }

  /**
   * stops streaming trades status for the specified symbol
   * @param {string} symbol
   */
  stopStreamTickPrices(symbol) {
    this._stopStreaming(`${XAPIConstants.STREAM_TICK_PRICES}_${symbol}`,
        'stopTickPrices');
  }

  /**
   * stops streaming trades status
   */
  stopStreamTradeStatus() {
    this._stopStreaming(XAPIConstants.STREAM_TRADE_STATUS, 'stopTradeStatus');
  }

  /**
   * stops streaming trades
   */
  stopStreamTrades() {
    this._stopStreaming(XAPIConstants.STREAM_TRADES, 'stopTrades');
  }

  /**
   * Allows to get actual account indicators values in real-time, as soon as
   * they are available in the system.
   * @yields {Balance}
   */
  streamBalance() {
    return this._streamOperation('getBalance', XAPIConstants.STREAM_BALANCE);
  }

  /**
   * Subscribes to API chart candles. The interval of every candle is 1 minute.
   * A new candle arrives every minute.
   * @param {string} symbol
   * @yields {Candle}
   */
  streamCandles(symbol) {
    return this._streamOperation('getCandles', XAPIConstants.STREAM_CANDLES,
        {symbol: symbol});
  }

  /**
   * Subscribes to 'keep alive' messages.
   * A new 'keep alive' message is sent by the API every 3 seconds
   * @fires XAPIConstants#.STREAM_KEEP_ALIVE
   */
  streamKeepAlive() {
    return this._streamOperation('keepAlive', XAPIConstants.STREAM_KEEP_ALIVE);
  }

  /**
   * Subscribes to news.
   * @return {News}
   */
  async* streamNews() {
    return this._streamOperation(XAPIConstants.STREAM_NEWS, 'getNews');
  }

  /**
   * Regularly calling this function is enough to refresh the internal state of
   * all the components in the system. Streaming connection, when any command
   * is not sent by client in the session, generates only one way network
   * traffic. It is recommended that any application that does not execute
   * other commands, should call this command at least once every 10 minutes.
   */
  streamPing() {
    return this._streamOperation(XAPIConstants.STREAM_PING, 'ping');
  }

  /**
   * Subscribes to profits
   * @yields Profit
   */
  streamProfits() {
    return this._streamOperation(XAPIConstants.STREAM_PROFITS, 'getProfits');
  }

  /**
   * Establishes subscription for quotations and allows to obtain the relevant
   * information in real-time, as soon as it is available in the system. The
   * getTickPrices command can be invoked many times for the same symbol, but
   * only one subscription for a given symbol will be created. Please beware
   * that when multiple records are available, the order in which they are
   * received is not guaranteed. minArrivalTime
   * @param {string} symbol Symbol
   * @param {number} minArrivalTime The minimal interval in milliseconds
   *     between any two consecutive updates.
   * @param {number} maxLevel
   * @yields TickPrice
   */
  async* streamTickPrices(symbol, {minArrivalTime = 0, maxLevel}) {
    return this._streamOperation(XAPIConstants.STREAM_TICK_PRICES,
        'streamTickPrices', {
          minArrivalTime: minArrivalTime, symbol: symbol, maxLevel: maxLevel,
        });
  }

  /**
   * Allows to get status for sent trade requests in real-time, as soon as it
   * is
   * available in the system. Please beware that when multiple records are
   * available, the order in which they are received is not guaranteed.
   * @fires XAPIConstants#.STREAM_TRADE_STATUS
   */
  streamTradeStatus() {
    this._streamOperation(XAPIConstants.STREAM_TRADE_STATUS, 'getTradeStatus');
  }

  /**
   * Establishes subscription for user trade status data and allows to obtain
   * the relevant information in real-time, as soon as it is available in the
   * system. Please beware that when multiple records are available, the order
   * in which they are received is not guaranteed.
   * @see http://developers.xstore.pro/documentation/2.5.0#streamTrades
   * @yields Trade
   */
  streamTrades() {
    return this._streamOperation(XAPIConstants.STREAM_TRADES, 'getTrades');
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
   * @return {Promise<Order>}
   */
  tradeTransaction(cmd, customComment, expiration, offset, order, price, sl,
      symbol, tp, type,
      volume) {
    return this._callOperation(XAPIConstants.TRADE_TRANSACTION,
        'tradeTransaction', {
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
   * Note: XApiClient#streamTradeStatus is the preferred way of retrieving
   * transaction status data.
   * @param {number} order  order number from tradeTransaction
   * @return {Promise<TradeStatus>}
   */
  async tradeTransactionStatus(order) {
    const response = await this._callOperation(
        XAPIConstants.TRADE_TRANSACTION_STATUS, 'tradeTransactionStatus',
        {order: order});
    if (response.ask !== response.bid) {
      throw new Error(
          `Error retrieving transaction price: Ask was ${response.ask},` +
          `Bid was ${response.bid}`);
    }
    response.price = response.ask;
    return response;
  }
}

export default XApiClient;
