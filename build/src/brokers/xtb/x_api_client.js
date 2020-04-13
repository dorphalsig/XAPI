/*
 *    Copyright 2020 David Sarmiento <dorphalsig@gmail.com>
 *
 *    Licensed under the Apache License, APIVersion 2.0 (the "License");
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
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var _data, _emitter, _password, _endpoint, _streamEndpoint, _sockets, _streamSessionId, _username;
import EventTarget2 from 'src/events/events';
import { Config } from './config';
import { Constants } from './x_api_constants';
/**
 * Javascript Implementation of the API to call remote operations on the XTB/X
 * Open Hub xStation 5 platform
 * @version 2.5.0
 * @see http://developers.xstore.pro/documentation/2.5.0
 * @todo define a maximum amount of messages/s that can go in a single
 *     streaming socket and then have the sockets identify if a new one must be
 *     opened
 */
export class XApiClient {
    constructor(username, password, isDemo) {
        this.isLoggedIn = false;
        _data.set(this, void 0);
        _emitter.set(this, void 0);
        _password.set(this, void 0);
        _endpoint.set(this, void 0);
        _streamEndpoint.set(this, void 0);
        _sockets.set(this, void 0);
        _streamSessionId.set(this, void 0);
        _username.set(this, void 0);
        __classPrivateFieldSet(this, _username, username);
        __classPrivateFieldSet(this, _password, password);
        __classPrivateFieldSet(this, _emitter, new EventTarget2());
        __classPrivateFieldSet(this, _endpoint, isDemo ? Config.DEMO_ENDPOINT : Config.LIVE_ENDPOINT);
        __classPrivateFieldSet(this, _streamEndpoint, isDemo ? Config.DEMO_ENDPOINT_STREAM : Config.LIVE_ENDPOINT_STREAM);
        __classPrivateFieldSet(this, _sockets, new Map());
        __classPrivateFieldSet(this, _data, new WeakMap());
        __classPrivateFieldSet(this, _streamSessionId, '');
    }
    static processChartRequest(chartInfo, symbol) {
        const candles = [];
        for (const response of chartInfo.rateInfos) {
            response.symbol = symbol;
            response.close = response.close / 10 ** chartInfo.digits;
            response.open = response.open / 10 ** chartInfo.digits;
            response.high = response.high / 10 ** chartInfo.digits;
            response.low = response.low / 10 ** chartInfo.digits;
            candles.push(response);
        }
        return candles;
    }
    /**
     * Returns array of all symbols available for the user.
     * @return
     */
    getAllSymbols() {
        return this.callOperation(Constants.ALL_SYMBOLS, 'getAllSymbols');
    }
    /**
     * Returns calendar with market events.
     * @return
     */
    getCalendar() {
        return this.callOperation(Constants.CALENDAR, 'getCalendar');
    }
    /**
     * Returns chart info, from start date to the current time.
     * Note: streamCandles is the preferred way of retrieving current candle data.
     * @param period
     * @param start
     * @param symbol
     * return {Promise<Candle[]>}
     * @see http://developers.xstore.pro/documentation/#getChartLastRequest
     */
    async getChartLastRequest(period, start, symbol) {
        const chartInfo = await this.callOperation(Constants.CHART_LAST_REQUEST, 'getCalendar', {
            info: { period: period, start: start, symbol: symbol },
        });
        return XApiClient.processChartRequest(chartInfo, symbol);
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
     * @param start timestamp
     * @param end timestamp
     * @param period
     * @param symbol
     * @param ticks
     * @return
     * @see http://developers.xstore.pro/documentation/#getChartRangeRequest
     */
    async getChartRangeRequest(start, end, period, symbol, ticks = 0) {
        const chartInfo = await this.callOperation(Constants.CHART_RANGE_REQUEST, 'getChartRangeRequest', {
            info: {
                start: start,
                end: end,
                period: period,
                symbol: symbol,
                ticks: ticks,
            },
        });
        return XApiClient.processChartRequest(chartInfo, symbol);
    }
    /**
     * Returns calculation of commission and rate of exchange.
     * The value is calculated as expected value, and therefore might not be
     * perfectly accurate.
     * @param tickerSymbol
     * @param volume
     * @return
     */
    getCommissionDef(tickerSymbol, volume) {
        return this.callOperation(Constants.COMMISSION_DEF, 'getCommissionDef', {
            symbol: tickerSymbol,
            volume: volume,
        });
    }
    /**
     * Returns information about account currency, and account leverage
     * for the current API user
     * @return
     */
    getCurrentUserData() {
        return this.callOperation(Constants.CURRENT_USER_DATA, 'getCurrentUserData');
    }
    /**
     * Returns IBs data from the given time range.
     * @param start (timestamp) Start of IBs history block
     * @param end (timestamp) End of IBs history block
     * @return
     */
    getIbsHistory(start, end) {
        return this.callOperation(Constants.IBS_HISTORY, 'getIbsHistory', {
            end: end,
            start: start,
        });
    }
    /**
     * Returns various account indicators
     * streamBalance is the preferred way of retrieving account indicators
     * @return
     */
    async getMarginLevel() {
        const result = await this.callOperation(Constants.MARGIN_LEVEL, 'getMarginLevel');
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
     * @return
     */
    getMarginTrade(symbol, volume) {
        return this.callOperation(Constants.MARGIN_TRADE, 'getMarginTrade', {
            symbol: symbol,
            volume: volume,
        });
    }
    /**
     * Returns news from trading server which were sent within specified Period
     * of time.
     * Note: streamNews is the preferred way of retrieving news data.
     * @param start (timestamp)
     * @param end (timestamp)
     * @return
     */
    getNews(start, end) {
        return this.callOperation(Constants.NEWS, 'getNews', {
            start: start,
            end: end,
        });
    }
    /**
     * Calculates estimated profit for given deal data Should be used for
     * calculator-like apps only. Profit for opened transactions should be
     * taken from server, due to higher precision of server calculation.
     * @param cmd Operation code
     * @param symbol symbol
     * @param volume volume
     * @param openPrice theoretical open price of order*
     * @param closePrice theoretical close price of order
     * @return
     */
    getProfitCalculation(cmd, symbol, volume, openPrice, closePrice) {
        return this.callOperation(Constants.PROFIT_CALCULATION, 'getProfitCalculation', {
            cmd: cmd,
            symbol: symbol,
            volume: volume,
            openPrice: openPrice,
            closePrice: closePrice,
        });
    }
    /**
     * Returns current time on trading server.
     * @return
     */
    getServerTime() {
        return this.callOperation(Constants.SERVER_TIME, 'getServerTime');
    }
    /**
     * Returns a list of step rules for DMAs
     * @return
     */
    getStepRules() {
        return this.callOperation(Constants.STEP_RULES, 'getStepRules');
    }
    /**
     * Returns information about symbol available for the user.
     * @return
     */
    getSymbol() {
        return this.callOperation(Constants.SYMBOL, 'getSymbol');
    }
    /**
     * Returns array of current quotations for given symbols, only quotations that
     * changed from given timestamp are returned. New timestamp obtained from
     * output will be used as an argument of the next call of this Command.
     * streamTickPrices is the preferred way of retrieving ticks data.
     * @param level price level
     * @param symbols Array of symbol names
     * @param timestamp The time from which the most recent tick should
     * be looked for. Historical prices cannot be obtained using this parameter.
     * It can only be used to verify whether a price has changed since the given
     * time.
     * @return
     * @see http://developers.xstore.pro/documentation/#getTickPrices
     */
    getTickPrices(level, symbols, timestamp) {
        return this.callOperation(Constants.TICK_PRICES, 'getTickPrices', {
            level: level,
            symbols: symbols,
            timestamp: timestamp,
        });
    }
    /**
     * Returns array of trades listed in orders argument.
     * @param orders Array of orders (position numbers)
     * @return
     */
    getTradeRecords(orders) {
        return this.callOperation(Constants.TRADE_RECORDS, 'getTradeRecords', {
            orders: orders,
        });
    }
    /**
     * Returns array of user's trades
     * Note: streamTrades is the preferred way of retrieving trades data.
     * @param openedOnly if true then only open trades will be returned
     * @return
     */
    getTrades(openedOnly) {
        return this.callOperation(Constants.TRADES, 'getTrades', {
            openedOnly: openedOnly,
        });
    }
    /**
     * Returns array of user's trades which were closed within specified Period
     * of time.
     * Note: streamTrades is the preferred way of retrieving trades data.
     * @param start (timestamp)
     * @param end (timestamp)
     * @return
     */
    getTradesHistory(start, end) {
        return this.callOperation(Constants.TRADES_HISTORY, 'getTradesHistory', {
            start: start,
            end: end,
        });
    }
    /**
     * Returns quotes and trading times.
     * @param symbols
     * @return
     */
    getTradingHours(symbols) {
        return this.callOperation(Constants.TRADING_HOURS, 'getTradingHours', {
            symbols: symbols,
        });
    }
    /**
     * Returns the current API version.
     * @return
     */
    getVersion() {
        return this.callOperation(Constants.VERSION, 'getVersion');
    }
    /**
     * In order to perform any action client applications have to perform login
     * process. No functionality is available before a successful login. After
     * initial login, a new session is created and all commands can executed by
     * an authenticated user until he/she logs out or drops the connection.
     */
    async login() {
        const errorEventType = Constants.ERROR_PREFIX + Constants.LOGIN;
        const socket = this.connectSocket('operation', __classPrivateFieldGet(this, _endpoint));
        const payload = {
            command: 'login',
            arguments: {
                userId: __classPrivateFieldGet(this, _username),
                password: __classPrivateFieldGet(this, _password),
            },
            customTag: Constants.LOGIN,
        };
        socket.send(JSON.stringify(payload));
        const errorPromise = () => __classPrivateFieldGet(this, _emitter).once(errorEventType);
        const successPromise = () => __classPrivateFieldGet(this, _emitter).once(Constants.LOGIN);
        const event = (await Promise.race([errorPromise(), successPromise()]));
        if (event.type === errorEventType) {
            throw new Error(`Could not log in: ${event.detail.errorDescr} (${event.detail.errorCode})`);
        }
        __classPrivateFieldSet(this, _streamSessionId, event.detail);
        this.isLoggedIn = true;
        return true;
    }
    /**
     * logs out and closes all the sockets
     */
    logout() {
        this.callOperation(Constants.LOGOUT, 'logout');
        this.isLoggedIn = false;
        __classPrivateFieldGet(this, _sockets).forEach((socket, key) => {
            socket.close();
            __classPrivateFieldGet(this, _sockets).delete(key);
        });
        __classPrivateFieldSet(this, _streamSessionId, '');
    }
    /**
     * Regularly calling this function is enough to refresh the internal state of
     * all the components in the system. It is recommended that any application
     * that does not execute other commands, should call this Command at least
     * once every 10 minutes.
     */
    ping() {
        this.callOperation(Constants.PING, 'ping');
    }
    /**
     * stops streaming Balance
     */
    stopStreamBalance() {
        this.stopStreaming(Constants.STREAM_BALANCE, 'stopBalance');
    }
    /**
     * stops streaming candles for the specified symbol
     * @param symbol
     */
    stopStreamCandles(symbol) {
        this.stopStreaming(Constants.STREAM_CANDLES, 'stopCandles');
    }
    /**
     * stops streaming Keep-Alive
     */
    stopStreamKeepAlive() {
        this.stopStreaming(Constants.STREAM_KEEP_ALIVE, 'stopKeepAlive');
    }
    /**
     * stops streaming News
     */
    stopStreamNews() {
        this.stopStreaming(Constants.STREAM_NEWS, 'stopNews');
    }
    /**
     * stops streaming Profits
     */
    stopStreamProfits() {
        this.stopStreaming(Constants.STREAM_PROFITS, 'stopProfits');
    }
    /**
     * stops streaming trades status for the specified symbol
     * @param symbol
     */
    stopStreamTickPrices(symbol) {
        this.stopStreaming(`${Constants.STREAM_TICK_PRICES}_${symbol}`, 'stopTickPrices');
    }
    /**
     * stops streaming trades status
     */
    stopStreamTradeStatus() {
        this.stopStreaming(Constants.STREAM_TRADE_STATUS, 'stopTradeStatus');
    }
    /**
     * stops streaming trades
     */
    stopStreamTrades() {
        this.stopStreaming(Constants.STREAM_TRADES, 'stopTrades');
    }
    /**
     * Allows to get actual account indicators values in real-time, as soon as
     * they are available in the system.
     * @yields
     */
    streamBalance() {
        return this.streamOperation('getBalance', Constants.STREAM_BALANCE);
    }
    /**
     * Subscribes to API chart candles. The interval of every candle is 1 minute.
     * A new candle arrives every minute.
     * @param symbol
     * @yields
     */
    streamCandles(symbol) {
        return this.streamOperation('getCandles', Constants.STREAM_CANDLES, {
            symbol: symbol,
        });
    }
    /**
     * Subscribes to 'keep alive' messages.
     * A new 'keep alive' message is sent by the API every 3 seconds
     */
    streamKeepAlive() {
        return this.streamOperation('keepAlive', Constants.STREAM_KEEP_ALIVE);
    }
    /**
     * Subscribes to news.
     * @return
     */
    async *streamNews() {
        yield* this.streamOperation(Constants.STREAM_NEWS, 'getNews');
    }
    /**
     * Regularly calling this function is enough to refresh the internal state of
     * all the components in the system. Streaming connection, when any Command
     * is not sent by client in the session, generates only one way network
     * traffic. It is recommended that any application that does not execute
     * other commands, should call this Command at least once every 10 minutes.
     */
    async *streamPing() {
        yield* this.streamOperation(Constants.STREAM_PING, 'ping');
    }
    /**
     * Subscribes to profits
     * @yields Profit
     */
    async *streamProfits() {
        yield* this.streamOperation(Constants.STREAM_PROFITS, 'getProfits');
    }
    /**
     * Establishes subscription for quotations and allows to obtain the relevant
     * information in real-time, as soon as it is available in the system. The
     * getTickPrices Command can be invoked many times for the same symbol, but
     * only one subscription for a given symbol will be created. Please beware
     * that when multiple records are available, the order in which they are
     * received is not guaranteed. minArrivalTime
     */
    async *streamTickPrices(symbol, { minArrivalTime = 0, maxLevel }) {
        const params = {
            minArrivalTime: minArrivalTime,
            symbol: symbol,
            maxLevel: maxLevel,
        };
        yield* this.streamOperation(Constants.STREAM_TICK_PRICES, 'streamTickPrices', params);
    }
    /**
     * Allows to get status for sent trade requests in real-time, as soon as it
     * is
     * available in the system. Please beware that when multiple records are
     * available, the order in which they are received is not guaranteed.
     */
    async *streamTradeStatus() {
        yield* this.streamOperation(Constants.STREAM_TRADE_STATUS, 'getTradeStatus');
    }
    /**
     * Establishes subscription for user trade status data and allows to obtain
     * the relevant information in real-time, as soon as it is available in the
     * system. Please beware that when multiple records are available, the order
     * in which they are received is not guaranteed.
     * @see http://developers.xstore.pro/documentation/2.5.0#streamTrades
     * @yields Trade
     */
    async *streamTrades() {
        yield* this.streamOperation(Constants.STREAM_TRADES, 'getTrades');
    }
    /**
     * Starts trade transaction. tradeTransaction sends main transaction
     * information to the server.
     * @param cmd Operation code
     * @param customComment The value the customer may provide in order
     * to retrieve it later.
     * @param expiration Pending order expiration time (timestamp)
     * @param offset Trailing offset
     * @param order 0 or position number for closing/modifications
     * @param price Trade price
     * @param sl Stop loss
     * @param symbol Trade symbol
     * @param tp Take profit
     * @param type Trade transaction type
     * @param volume Trade volume
     * @return
     */
    tradeTransaction(cmd, customComment, expiration, offset, order, price, sl, symbol, tp, type, volume) {
        return this.callOperation(Constants.TRADE_TRANSACTION, 'tradeTransaction', {
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
     * Note: XApiClient#StreamTradeStatus is the preferred way of retrieving
     * transaction status data.
     * @param order  order number from tradeTransaction
     * @return
     */
    async tradeTransactionStatus(order) {
        const response = await this.callOperation(Constants.TRADE_TRANSACTION_STATUS, 'tradeTransactionStatus', { order: order });
        if (response.ask !== response.bid) {
            throw new Error(`Error retrieving transaction price: Ask was ${response.ask},` + `Bid was ${response.bid}`);
        }
        response.price = response.ask;
        return response;
    }
    /**
     * Generic method that sends a message to the server and (asynchronously)
     * waits for a reply
     */
    async callOperation(customTag, operationName, args = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) {
        this.checkLoggedIn();
        const payload = { command: operationName, customTag: customTag };
        if (Object.keys(args).length !== 0 || args.constructor !== Object) {
            payload.arguments = args;
        }
        const socket = __classPrivateFieldGet(this, _sockets).get('operation');
        if (typeof socket === 'undefined') {
            throw Error('Could not find socket');
        }
        socket.send(JSON.stringify(payload));
        return (await __classPrivateFieldGet(this, _emitter).once(operationName)).detail;
    }
    /**
     * checks if a user is logged in, throws error if not
     * @private
     */
    checkLoggedIn() {
        if (!this.isLoggedIn) {
            throw new Error('Not logged in');
        }
    }
    /**
     * opens a socket and connects to the XTB/ XOpen Hub Server
     * @param name the name of the socket, this will be used to route
     * the async messages. Basically each streaming message has its own dedicated
     *     socket
     * @param endpoint WSS endpoint
     */
    connectSocket(name, endpoint = __classPrivateFieldGet(this, _endpoint)) {
        if (__classPrivateFieldGet(this, _sockets).has(name)) {
            console.log(`socket ${name} already exists. Doing nothing`);
            return __classPrivateFieldGet(this, _sockets).get(name);
        }
        const socket = new WebSocket(endpoint);
        socket.onclose = closeEvent => {
            console.log(`Socket ${name} disconnected`);
            if (closeEvent.code !== 1000) {
                throw new Error('The server unexpectedly closed the connection.' +
                    `Error code ${closeEvent.code}. More info can be found in` +
                    'https://www.iana.org/assignments/websocket/websocket.xml#close-code-number');
            }
            __classPrivateFieldGet(this, _sockets).delete(name);
            __classPrivateFieldGet(this, _data).delete(socket);
        };
        socket.onmessage = messageEvent => {
            this.parseResponse(messageEvent.data, socket);
        };
        __classPrivateFieldGet(this, _sockets).set(name, socket);
        __classPrivateFieldGet(this, _data).set(socket, '');
        return socket;
    }
    /**
     * parses the response and publishes an event so the corresponding
     * handler can take care of it
     * @param rcvd message
     * @param socket socket which received the message
     * @private
     */
    parseResponse(rcvd, socket) {
        const responses = (__classPrivateFieldGet(this, _data).get(socket) + rcvd).trim().split('\n\n');
        // API messages are always terminated with two newlines
        const remainder = rcvd.lastIndexOf('\n\n') === rcvd.length - 2 ? '' : responses.pop();
        if (typeof remainder === 'undefined') {
            throw new Error('');
        }
        __classPrivateFieldGet(this, _data).set(socket, remainder);
        for (const response of responses) {
            const responseObj = JSON.parse(response);
            if (responseObj.status) {
                const returnData = responseObj.customTag === Constants.LOGIN
                    ? responseObj.streamSessionId
                    : responseObj.returnData;
                __classPrivateFieldGet(this, _emitter).dispatchEvent(new CustomEvent(responseObj.customTag, { detail: returnData }));
                continue;
            }
            window.alert('xxx');
            const event = new CustomEvent(Constants.ERROR_PREFIX + responseObj.customTag, {
                detail: responseObj,
            });
            __classPrivateFieldGet(this, _emitter).dispatchEvent(event);
            console.warn(`Call with customTag ${responseObj.customTag}` +
                `Failed: ${responseObj.errorDescr} (code: ${responseObj.errorCode})`);
        }
    }
    /**
     * generic method to stop streaming a Command
     * @param customTag
     * @param stopCommand
     * @param args
     * @return
     * @private
     */
    stopStreaming(customTag, stopCommand, args = {}) {
        const socket = __classPrivateFieldGet(this, _sockets).get(customTag);
        if (typeof socket === 'undefined') {
            return false;
        }
        __classPrivateFieldGet(this, _emitter).off(customTag);
        const payload = {
            command: stopCommand,
            streamSessionId: __classPrivateFieldGet(this, _streamSessionId),
        };
        if (Object.keys(args).length > 0) {
            Object.assign(payload, args);
        }
        socket.send(JSON.stringify(payload));
        socket.close();
        __classPrivateFieldGet(this, _sockets).delete(customTag);
        return true;
    }
    /**
     * opens a socket and subscribes to a specific stream yielding its result
     * when the subscription is cancelled (see stopStreaming) it closes the
     * socket
     * @param customTag
     * @param command
     * @param args the operation parameters
     * @yields the received data
     * @private
     */
    async *streamOperation(customTag, command, args = {}) {
        this.checkLoggedIn();
        if (__classPrivateFieldGet(this, _sockets).has(customTag)) {
            return;
        }
        const socket = this.connectSocket(customTag, __classPrivateFieldGet(this, _streamEndpoint));
        __classPrivateFieldGet(this, _sockets).set(customTag, socket);
        const payload = { command: command, customTag: customTag };
        if (Object.keys(args).length !== 0 || args.constructor !== Object) {
            Object.assign(payload, args);
        }
        socket.send(JSON.stringify(payload));
        for await (const triggeredEvent of __classPrivateFieldGet(this, _emitter).on(customTag)) {
            yield triggeredEvent.detail;
        }
    }
}
_data = new WeakMap(), _emitter = new WeakMap(), _password = new WeakMap(), _endpoint = new WeakMap(), _streamEndpoint = new WeakMap(), _sockets = new WeakMap(), _streamSessionId = new WeakMap(), _username = new WeakMap();
//# sourceMappingURL=x_api_client.js.map