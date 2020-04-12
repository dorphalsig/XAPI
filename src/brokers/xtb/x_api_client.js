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
export default class XApiClient {
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
   * @param {Object} args the operation parameter;
   * @return {Promise<*>}
   * @private
   * */
  async _callOperation(customTag, operationName, args = {}) {
    this._checkLoggedIn();
    const payload = {command: operationName, customTag: customTag};
    if (Object.keys(args).length !== 0 || args.constructor !== Object) {
      // @ts-ignore
      payload.arguments = args;
    }
    const socket = this.#sockets.get('operation');
    if (typeof socket === 'undefined') {
      throw Error('Could not find socket');
    }
    socket.send(JSON.stringify(payload));

    // @ts-ignore
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

    if (typeof this.#sockets.get(name) !== 'undefined') {
      console.log(`socket ${name} already exists. Doing nothing`);
      // @ts-ignore
      return this.#sockets.get(name);
    }
    const socket = new WebSocket(endpoint);
    socket.onclose = (closeEvent => {
      console.log(`Socket ${name} disconnected`);
      if (closeEvent.code !== 1000) {
        throw new Error(
            'The server unexpectedly closed the connection.' +
            `Error code ${closeEvent.code}. More info can be found in` +
            'https://www.iana.org/assignments/websocket/websocket.xml#close-code-number');
      }
      this.#sockets.delete(name);
      this.#data.delete(socket);
    });

    socket.onmessage = ((messageEvent) => {
      this._parseResponse(messageEvent.data, socket);
    });

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
    if (typeof remainder === 'undefined') {
      throw new Error('');
    }
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
   * @param {ChartInfo} chartInfo
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
    const socket = this.#sockets.get(customTag);
    if (typeof socket === 'undefined') {
      return false;
    }

    this.#emitter.off(customTag);
    const payload = {
      command: stopCommand,
      streamSessionId: this.#streamSessionId,
    };
    if (Object.keys(args).length > 0) {
      Object.assign(payload, args);
    }
    socket.send(JSON.stringify(payload));
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
   * @yields {AsyncGenerator<*>} the received data
   * @private
   */
  async* _streamOperation(customTag, command, args = {}) {
    this._checkLoggedIn();

    if (this.#sockets.has(customTag)) {
      return;
    }
    const socket = this._connectSocket(customTag, this.#streamEndpoint);
    this.#sockets.set(customTag, socket);
    const payload = {command: command, customTag: customTag};
    if (Object.keys(args).length !== 0 || args.constructor !== Object) {
      Object.assign(payload, args);
    }
    socket.send(JSON.stringify(payload));
    // @ts-ignore
    for await(let triggeredEvent of this.#emitter.on(customTag)) {
      yield triggeredEvent.detail;
    }
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
  async getMarginLevel() {
    const result = await this._callOperation(XAPIConstants.MARGIN_LEVEL,
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

    const errorEventType = XAPIConstants.ERROR_PREFIX + XAPIConstants.LOGIN;
    const socket = this._connectSocket('operation', this.#endpoint);
    const payload = {
      command: 'login', arguments: {
        userId: this.#username, password: this.#password,
      }, customTag: XAPIConstants.LOGIN,
    };

    socket.send(JSON.stringify(payload));
    const errorPromise = () => this.#emitter.once(errorEventType);
    const successPromise = () => this.#emitter.once(
        XAPIConstants.LOGIN);

    const event = await Promise.race([errorPromise(), successPromise()]);
    if (event.type === errorEventType) {
      throw new Error(
          // @ts-ignore
          `Could not log in: ${event.detail.errorDescr} (${event.detail.errorCode})`);
    }

    // @ts-ignore
    this.#streamSessionId = event.detail;
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
    this.#streamSessionId = '';
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
   * @return {AsyncGenerator<News>}
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
   * @param {Object} options
   * @param {number} options.minArrivalTime The minimal interval in milliseconds
   * between any two consecutive updates.
   * @param {number} options.maxLevel
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
/**
 * @typedef Balance
 * @type {Object}
 * @property {number} balance balance in account currency
 * @property {number} credit credit in account currency
 * @property {?string} currency user currency  (only in getMarginLevel)
 * @property {number} equity sum of balance and all profits in account currency
 * @property {number} margin margin requirements
 * @property {number} marginFree free margin
 * @property {number} marginLevel margin level percentage
 */

/**
 * @typedef News
 * @type {Object}
 * @property {string} body Body
 * @property {string} key News key
 * @property {number} time Time (timestamp)
 * @property {string} title News title
 */

/**
 * @typedef Candle
 * @type {RateInfoRecord}
 * @property {number} close Close price in base currency
 * @property {number} ctm Candle start time in CET time zone (timestamp)
 * @property {string} ctmString String representation of the ctm field
 * @property {number} high Highest value in the given period in base currency
 * @property {number} low Lowest value in the given period in base currency
 * @property {number} open Open price in base currency
 * @property {?XApiClient.quoteId} quoteId Source of price (only for streaming)
 * @property {?string} symbol Symbol (only for streaming)
 * @property {number} vol Volume in lots
 */

/**
 * @typedef TickPrice
 * @type {Object}
 * @property {number} ask Ask price in base currency
 * @property {number} askVolume Number of available lots to buy at given price
 *     or null if not applicable
 * @property {number} bid Bid price in base currency
 * @property {number} bidVolume Number of available lots to buy at given price
 *     or null if not applicable
 * @property {number} high The highest price of the day in base currency
 * @property {number} level Price level
 * @property {number} low The lowest price of the day in base currency
 * @property {?XApiClient.quoteId} quoteId Source of price, detailed
 *     description
 *     below
 * @property {number} spreadRaw The difference between raw ask and bid prices
 * @property {number} spreadTable Spread representation
 * @property {string} symbol Symbol
 * @property {number} timestamp Timestamp
 */

/**
 * @typedef Trade
 * @type {Object}
 * @property {number} close_price Close price in base currency
 * @property {?number} close_time Null if order is not closed
 * @property {boolean} closed Closed
 * @property {XApiClient.command} cmd Operation code
 * @property {string} comment Comment
 * @property {?number} commission Commission in account currency, null if not
 *     applicable
 * @property {?string} customComment The value the customer may provide in
 *     order
 *     to retrieve it later.
 * @property {number} digits Number of decimal places
 * @property {?number} expiration Null if order is not closed
 * @property {number} margin_rate Margin rate
 * @property {number} offset Trailing offset
 * @property {number} open_price Open price in base currency
 * @property {number} open_time Open time
 * @property {number} order Order number for opened transaction
 * @property {number} order2 Transaction id
 * @property {number} position Position number (if type is 0 and 2) or
 *     transaction parameter (if type is 1)
 * @property {?number} profit null unless the trade is closed (type=2) or
 *     opened
 *     (type=0)
 * @property {number} sl Zero if stop loss is not set (in base currency)
 * @property {?string} state Trade state, should be used for detecting pending
 *     order's cancellation (only in streamTrades)
 * @property {number} storage Storage
 * @property {string} symbol Symbol
 * @property {number} tp Zero if take profit is not set (in base currency)
 * @property {?number} type type (only in streamTrades)
 * @property {number} volume Volume in lots
 * @property {?number} timestamp Timestamp (only in getTrades)
 * @property {number} nominalValue
 * @property {number} spread
 * @property {number} taxes
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
 * @property {boolean} currencyPair Indicates whether the symbol represents a
 *     currency pair
 * @property {string} currencyProfit The currency of calculated profit
 * @property {string} description Description
 * @property {number} expiration Null if not applicable
 * @property {string} groupName Symbol group name
 * @property {number} high The highest price of the day in base currency
 * @property {number} initialMargin Initial margin for 1 lot order, used for
 *     profit/margin calculation
 * @property {number} instantMaxVolume Maximum instant volume multiplied by 100
 *     (in lots)
 * @property {number} leverage Symbol leverage
 * @property {boolean} longOnly Long only
 * @property {number} lotMax Maximum size of trade
 * @property {number} lotMin Minimum size of trade
 * @property {number} lotStep A value of minimum step by which the size of
 *     trade can be changed (within lotMin - lotMax range)
 * @property {number} low The lowest price of the day in base currency
 * @property {number} marginHedged Used for profit calculation
 * @property {boolean} marginHedgedStrong For margin calculation
 * @property {number} marginMaintenance For margin calculation, null if not
 *     applicable
 * @property {number} marginMode For margin calculation
 * @property {number} percentage Percentage
 * @property {number} pipsPrecision Number of symbol's pip decimal places
 * @property {number} precision Number of symbol's price decimal places
 * @property {number} profitMode For profit calculation
 * @property {number} quoteId Source of price
 * @property {boolean} shortSelling Indicates whether short selling is allowed
 *     on the instrument
 * @property {number} spreadRaw The difference between raw ask and bid prices
 * @property {number} spreadTable Spread representation
 * @property {number} starting Null if not applicable
 * @property {number} stepRuleId Appropriate step rule ID from getStepRules
 *     command response
 * @property {number} stopsLevel Minimal distance (in pips) from the current
 *     price where the stopLoss/takeProfit can be set
 * @property {number} swap_rollover3days number when additional swap is
 *     accounted for weekend
 * @property {boolean} swapEnable Indicates whether swap value is added to
 *     position on end of day
 * @property {number} swapLong Swap value for long positions in pips
 * @property {number} swapShort Swap value for short positions in pips
 * @property {number} swapType Type of swap calculated
 * @property {string} symbol Symbol name
 * @property {number} tickSize Smallest possible price change, used for
 *     profit/margin calculation, null if not applicable
 * @property {number} tickValue Value of smallest possible price change (in
 *     base currency), used for profit/margin calculation, null if not
 *     applicable
 * @property {number} number Ask & bid tick number
 * @property {string} numberString number in String
 * @property {boolean} trailingEnabled Indicates whether trailing stop (offset)
 *     is applicable to the instrument.
 * @property {number} type Instrument class number
 */

/**
 * @typedef Calendar
 * @type {Object}
 * @property {string} country Two letter country code
 * @property {string} current Market value (current), empty before time of
 *     release of this value (time from "time" record)
 * @property {string} forecast Forecasted value
 * @property {string} impact Impact on market
 * @property {string} period Information period
 * @property {string} previous Value from previous information release
 * @property {time} time Time, when the information will be released (in this
 *     time empty "current" value should be changed with exact released value)
 * @property {string} title Name of the indicator for which values will be
 *     released
 */

/**
 * @typedef ChartInfoRecord
 * @type {Object}
 * @property {number} digits
 * @property {rateInfoRecord[]} rateInfos
 */

/**
 * @typedef rateInfoRecord
 * @type {Object}
 * @property {number} close Value of close price (shift from open price)
 * @property {number} ctm Candle start time in CET / CEST time zone (see
 *     Daylight Saving Time, DST)
 * @property {string} ctm String  String representation of the 'ctm' field
 * @property {number} high Highest value in the given period (shift from open
 *     price)
 * @property {number} low Lowest value in the given period (shift from open
 *     price)
 * @property {number} open Open price (in base currency * 10 to the power of
 *     digits)
 * @property {number} vol Volume in lots
 */

/**
 * @typedef Commission
 * @type {Object}
 * @property {number} commission calculated commission in account currency,
 *     could be null if not applicable
 * @property {?number} rateOfExchange rate of exchange between account currency
 *     and instrument base currency, could be null if not applicable
 */

/**
 * @typedef UserData
 * @type {Object}
 * @property {number} companyUnit Unit the account is assigned to.
 * @property {string} currency account currency
 * @property {string} group group
 * @property {boolean} ibAccount Indicates whether this account is an IB
 *     account.
 * @property {number} leverageMultiplier The factor used for margin
 *     calculations. The actual value of leverage can be calculated by dividing
 *     this value by 100.
 * @property {string} spreadType spreadType, null if not applicable
 * @property {boolean} trailingStop Indicates whether this account is enabled
 *     to use trailing stop.
 */

/**
 * @typedef IB
 * @type {Object}
 * @property {number|null} closePrice IB close price or null if not allowed to
 *     view
 * @property {string|null} login IB user login or null if not allowed to view
 * @property {number|null} nominal IB nominal or null if not allowed to view
 * @property {number|null} openPrice IB open price or null if not allowed to
 *     view
 * @property {number|null} side Operation code or null if not allowed to view
 * @property {string|null} surname IB user surname or null if not allowed to
 *     view
 * @property {string|null} symbol Symbol or null if not allowed to view
 * @property {number|null} timestamp Time the record was created or null if not
 *     allowed to view
 * @property {number|null} volume  Volume in lots or null if not allowed to
 *     view
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
 * @property {string}  customComment The value the customer may provide in
 *     order to retrieve it later.
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
 * @property {string} customComment The value the customer may provide in order
 *     to retrieve it later.
 * @property {string} message Can be null
 * @property {number} order Unique order number
 * @property {number} price Price in base currency
 * @property {number} requestStatus Request status code, described below
 */

/**
 * @typedef ChartInfo
 * @type {Object}
 * @property {number} digits Number of decimal places
 * @property {RateInfoRecord[]} rateInfos
 */

/**
 * @typedef RateInfoRecord
 * @type {Object}
 * @property {string} symbol instrument symbol
 * @property {number} close Value of close price (shift from open price)
 * @property {number} ctm Candle start time in CET / CEST time zone (see
 *     Daylight Saving Time, DST)
 * @property {string} ctmString String representation of the 'ctm' field
 * @property {number} high Highest value in the given period (shift from open
 *     price)
 * @property {number} low Lowest value in the given period (shift from open
 *     price)
 * @property {number} open Open price (in base currency * 10 to the power of
 *     digits)
 * @property {number} vol Volume in lots
 */

/**
 * @typedef Version
 * @type {Object}
 * @property {string} version version string
 */

