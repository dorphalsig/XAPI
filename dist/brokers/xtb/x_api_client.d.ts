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

export default XApiClient;

/**
 * Javascript Implementation of the API to call remote operations on the XTB/X
 * Open Hub xStation 5 platform
 * @version 2.5.0
 * @see http://developers.xstore.pro/documentation/2.5.0
 * @todo define a maximum amount of messages/s that can go in a single
 *     streaming socket and then have the sockets identify if a new one must be
 *     opened
 */
declare class XApiClient {
    /**
     * @readonly
     * @enum {number}
     */
    static readonly Period: Readonly<{
        /** 1 minute */
        PERIOD_M1: number;
        /** 5 minutes */
        PERIOD_M5: number;
        /** 15 minutes */
        PERIOD_M15: number;
        /** 30 minutes */
        PERIOD_M30: number;
        /** 1 hour */
        PERIOD_H1: number;
        /** 4 hours */
        PERIOD_H4: number;
        /** 1 day */
        PERIOD_D1: number;
        /** 1 week */
        PERIOD_W1: number;
        /** 30 days */
        PERIOD_MN1: number;
    }>;
    /**
     * @readonly
     * @enum {number}
     */
    static readonly command: Readonly<{
        BUY: number;
        SELL: number;
        BUY_LIMIT: number;
        SELL_LIMIT: number;
        BUY_STOP: number;
        SELL_STOP: number;
        BALANCE: number;
        CREDIT: number;
    }>;
    /**
     * @readonly
     * @enum {number}
     */
    static readonly quoteId: Readonly<{
        FIXED: number;
        FLOAT: number;
        DEPTH: number;
        CROSS: number;
    }>;
    /**
     * @readonly
     * @enum {number}
     */
    static readonly streamTradeStatus: Readonly<{
        ERROR: number;
        PENDING: number;
        ACCEPTED: number;
        REJECTED: number;
    }>;
    /**
     * @readonly
     * @enum {string}
     */
    static readonly streamTradesState: Readonly<{
        MODIFIED: string;
        DELETED: string;
    }>;
    /**
     * @readonly
     * @enum {number}
     */
    static readonly tradeType: Readonly<{
        OPEN: number;
        PENDING: number;
        CLOSE: number;
        MODIFY: number;
        DELETE: number;
    }>;
    /**
     * Returns various account indicators
     * Note: streamBalance is the preferred way of retrieving account
     * return {Promise<Balance>}
     * indicators.
     */
    /** @type {boolean} */
    isLoggedIn: boolean;
    /**
     * generic method that sends a message to the server and (asynchronously)
     * waits for a reply
     * @param {string} customTag
     * @param {string} operationName
     * @param {Object} args the operation parameters
     * @return {Object}
     * @private
     * */
    private _callOperation;
    /**
     * checks if a user is logged in, throws error if not
     * @private
     */
    private _checkLoggedIn;
    /**
     * opens a socket and connects to the XTB/ XOpen Hub Server
     * @param  {string} name the name of the socket, this will be used to route
     * the async messages. Basically each streaming message has its own dedicated
     *     socket
     * @param {string} endpoint WSS endpoint
     * @return {WebSocket}
     * @private
     */
    private _connectSocket;
    /**
     * parses the response and publishes an event so the corresponding
     * handler can take care of it
     * @param {string} rcvd message
     * @param {WebSocket} socket socket which received the message
     * @private
     */
    private _parseResponse;
    /**
     *
     * @param {object} chartInfo
     * @param {string} symbol
     * @return {Candle[]}
     * @private
     */
    private _processChartRequest;
    /**
     * generic method to stop streaming a command
     * @param {string} customTag
     * @param {string} stopCommand
     * @param {object} args
     * @return {boolean}
     * @private
     */
    private _stopStreaming;
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
    private _streamOperation;
    #private;

    /**
     * Asynchronous Constructor
     * @param {string} username
     * @param {string} password
     * @param {boolean} isDemo
     */
    constructor(username: string, password: string, isDemo: boolean);

    /**
     * Returns array of all symbols available for the user.
     * @return {Promise<TickerSymbol[]>}
     */
    getAllSymbols(): Promise<any[]>;

    /**
     * Returns calendar with market events.
     * @return {Promise<Calendar[]>}
     */
    getCalendar(): Promise<any[]>;

    /**
     * Returns chart info, from start date to the current time.
     * Note: streamCandles is the preferred way of retrieving current candle data.
     * @param {XApiClient.Period} period
     * @param {number} start
     * @param {string} symbol
     * return {Promise<Candle[]>}
     * @see http://developers.xstore.pro/documentation/#getChartLastRequest
     */
    getChartLastRequest(period: Readonly<{
        /** 1 minute */
        PERIOD_M1: number;
        /** 5 minutes */
        PERIOD_M5: number;
        /** 15 minutes */
        PERIOD_M15: number;
        /** 30 minutes */
        PERIOD_M30: number;
        /** 1 hour */
        PERIOD_H1: number;
        /** 4 hours */
        PERIOD_H4: number;
        /** 1 day */
        PERIOD_D1: number;
        /** 1 week */
        PERIOD_W1: number;
        /** 30 days */
        PERIOD_MN1: number;
    }>, start: number, symbol: string): Promise<any[]>;

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
    getChartRangeRequest(start: number, end: number, period: Readonly<{
        /** 1 minute */
        PERIOD_M1: number;
        /** 5 minutes */
        PERIOD_M5: number;
        /** 15 minutes */
        PERIOD_M15: number;
        /** 30 minutes */
        PERIOD_M30: number;
        /** 1 hour */
        PERIOD_H1: number;
        /** 4 hours */
        PERIOD_H4: number;
        /** 1 day */
        PERIOD_D1: number;
        /** 1 week */
        PERIOD_W1: number;
        /** 30 days */
        PERIOD_MN1: number;
    }>, symbol: string, ticks?: number): Promise<any[]>;

    /**
     * Returns calculation of commission and rate of exchange.
     * The value is calculated as expected value, and therefore might not be
     * perfectly accurate.
     * @param {string} tickerSymbol
     * @param {number} volume
     * @return {Promise<Commission>}
     */
    getCommissionDef(tickerSymbol: string, volume: number): Promise<any>;

    /**
     * Returns information about account currency, and account leverage
     * for the current API user
     * @return {Promise<UserData>}
     */
    getCurrentUserData(): Promise<any>;

    /**
     * Returns IBs data from the given time range.
     * @param {number} start (timestamp) Start of IBs history block
     * @param {number} end (timestamp) End of IBs history block
     * @return {Promise<IB[]>}
     */
    getIbsHistory(start: number, end: number): Promise<any[]>;

    /**
     * Returns various account indicators
     * streamBalance is the preferred way of retrieving account indicators
     * @return {Promise<Balance>}
     */
    getMarginLevel(): Promise<any>;

    /**
     * Returns expected margin for given instrument and volume.
     * The value is calculated as expected margin value, and therefore might not
     * be perfectly accurate.
     * @param {string} symbol
     * @param {number} volume
     * @return {Promise<Margin>}
     */
    getMarginTrade(symbol: string, volume: number): Promise<any>;

    /**
     * Returns news from trading server which were sent within specified Period
     * of time.
     * Note: streamNews is the preferred way of retrieving news data.
     * @param {number} start (timestamp)
     * @param {number} end (timestamp)
     * @return {Promise<News[]>}
     */
    getNews(start: number, end: number): Promise<any[]>;

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
    getProfitCalculation(cmd: Readonly<{
        BUY: number;
        SELL: number;
        BUY_LIMIT: number;
        SELL_LIMIT: number;
        BUY_STOP: number;
        SELL_STOP: number;
        BALANCE: number;
        CREDIT: number;
    }>, symbol: string, volume: number, openPrice: number, closePrice: number): Promise<any>;

    /**
     * Returns current time on trading server.
     * @return {Promise<ServerTime>}
     */
    getServerTime(): Promise<any>;

    /**
     * Returns a list of step rules for DMAs
     * @return {Promise<StepRule[]>}
     */
    getStepRules(): Promise<any[]>;

    /**
     * Returns information about symbol available for the user.
     * @return {Promise<TickerSymbol>}
     */
    getSymbol(): Promise<any>;

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
    getTickPrices(level: number, symbols: string[], timestamp: number): Promise<any[]>;

    /**
     * Returns array of trades listed in orders argument.
     * @param {number[]} orders Array of orders (position numbers)
     * @return {Promise<Trade[]>}
     */
    getTradeRecords(orders: number[]): Promise<any[]>;

    /**
     * Returns array of user's trades
     * Note: streamTrades is the preferred way of retrieving trades data.
     * @param {boolean} openedOnly if true then only open trades will be returned
     * @return {Promise<Trade[]>}
     */
    getTrades(openedOnly: boolean): Promise<any[]>;

    /**
     * Returns array of user's trades which were closed within specified Period
     * of time.
     * Note: streamTrades is the preferred way of retrieving trades data.
     * @param {number} start (timestamp)
     * @param {number} end (timestamp)
     * @return {Promise<Trade[]>}
     */
    getTradesHistory(start: number, end: number): Promise<any[]>;

    /**
     * Returns quotes and trading times.
     * @param {string[]} symbols
     * @return {Promise<TradingHours[]>}
     */
    getTradingHours(symbols: string[]): Promise<any[]>;

    /**
     * Returns the current API version.
     * @return {Promise<Version>}
     */
    getVersion(): Promise<any>;

    /**
     * In order to perform any action client applications have to perform login
     * process. No functionality is available before a successful login. After
     * initial login, a new session is created and all commands can executed by
     * an authenticated user until he/she logs out or drops the connection.
     */
    login(): Promise<boolean>;

    /**
     * logs out and closes all the sockets
     */
    logout(): void;

    /**
     * Regularly calling this function is enough to refresh the internal state of
     * all the components in the system. It is recommended that any application
     * that does not execute other commands, should call this command at least
     * once every 10 minutes.
     */
    ping(): void;

    /**
     * stops streaming Balance
     */
    stopStreamBalance(): void;

    /**
     * stops streaming candles for the specified symbol
     * @param {string} symbol
     */
    stopStreamCandles(symbol: string): void;

    /**
     * stops streaming Keep-Alive
     */
    stopStreamKeepAlive(): void;

    /**
     * stops streaming News
     */
    stopStreamNews(): void;

    /**
     * stops streaming Profits
     */
    stopStreamProfits(): void;

    /**
     * stops streaming trades status for the specified symbol
     * @param {string} symbol
     */
    stopStreamTickPrices(symbol: string): void;

    /**
     * stops streaming trades status
     */
    stopStreamTradeStatus(): void;

    /**
     * stops streaming trades
     */
    stopStreamTrades(): void;

    /**
     * Allows to get actual account indicators values in real-time, as soon as
     * they are available in the system.
     * @yields {Balance}
     */
    streamBalance(): boolean;

    /**
     * Subscribes to API chart candles. The interval of every candle is 1 minute.
     * A new candle arrives every minute.
     * @param {string} symbol
     * @yields {Candle}
     */
    streamCandles(symbol: string): boolean;

    /**
     * Subscribes to 'keep alive' messages.
     * A new 'keep alive' message is sent by the API every 3 seconds
     * @fires XAPIConstants#.STREAM_KEEP_ALIVE
     */
    streamKeepAlive(): boolean;

    /**
     * Subscribes to news.
     * @return {News}
     */
    streamNews(): any;

    /**
     * Regularly calling this function is enough to refresh the internal state of
     * all the components in the system. Streaming connection, when any command
     * is not sent by client in the session, generates only one way network
     * traffic. It is recommended that any application that does not execute
     * other commands, should call this command at least once every 10 minutes.
     */
    streamPing(): boolean;

    /**
     * Subscribes to profits
     * @yields Profit
     */
    streamProfits(): boolean;

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
    streamTickPrices(symbol: string, {minArrivalTime, maxLevel}: number): AsyncGenerator<never, boolean, unknown>;

    /**
     * Allows to get status for sent trade requests in real-time, as soon as it
     * is
     * available in the system. Please beware that when multiple records are
     * available, the order in which they are received is not guaranteed.
     * @fires XAPIConstants#.STREAM_TRADE_STATUS
     */
    streamTradeStatus(): void;

    /**
     * Establishes subscription for user trade status data and allows to obtain
     * the relevant information in real-time, as soon as it is available in the
     * system. Please beware that when multiple records are available, the order
     * in which they are received is not guaranteed.
     * @see http://developers.xstore.pro/documentation/2.5.0#streamTrades
     * @yields Trade
     */
    streamTrades(): boolean;

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
    tradeTransaction(cmd: Readonly<{
        BUY: number;
        SELL: number;
        BUY_LIMIT: number;
        SELL_LIMIT: number;
        BUY_STOP: number;
        SELL_STOP: number;
        BALANCE: number;
        CREDIT: number;
    }>, customComment: string, expiration: number, offset: number, order: number, price: number, sl: number, symbol: string, tp: number, type: Readonly<{
        OPEN: number;
        PENDING: number;
        CLOSE: number;
        MODIFY: number;
        DELETE: number;
    }>, volume: number): Promise<any>;

    /**
     * Returns current transaction status. At any time of transaction processing
     * client might check the status of transaction on server side. In order to
     * do that client must provide unique order taken from tradeTransaction.
     * Note: XApiClient#streamTradeStatus is the preferred way of retrieving
     * transaction status data.
     * @param {number} order  order number from tradeTransaction
     * @return {Promise<TradeStatus>}
     */
    tradeTransactionStatus(order: number): Promise<any>;
}
