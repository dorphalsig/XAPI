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
 * Javascript Implementation of the API to call remote operations on the XTB/X Open Hub xStation 5 platform
 * @version 2.5.0
 * @see http://developers.xstore.pro/documentation/2.5.0
 * @extends {EventEmitter}
 * @todo define a maximum amount of messages/s that can go in a single streaming socket and then have the sockets identify if a new one must be opened
 */
declare class XApiClient {
    /** @type {boolean} */
    isLoggedIn: boolean;
    /**
     * opens a socket and connects to the XTB/ XOpen Hub Server
     * @param  {string} name the name of the socket, this will be used to route
     * the async messages. Basically each streaming message has its own dedicated socket
     * @param {number} port port to which to connect
     * @return {TLSSocket}
     * @private
     */
    private _connectSocket;
    /**
     * generic method to stop streaming a command
     * @param customTag
     * @param stopCommand
     * @param args
     * @return {boolean}
     * @private
     */
    private _stopStreaming;
    #private;

    /**
     * Asynchronous Constructor
     * @param {string} username
     * @param {string} password
     * @param {boolean} isDemo
     */
    constructor(username: string, password: string, isDemo: boolean);

    /**
     * generic method that sends a message to the server and (asynchronously) waits for a reply
     * @param {string} customTag
     * @param {string} operationName
     * @param {Object} args the operation parameters
     * */
    _callOperation(customTag: string, operationName: string, args?: Object, ...args: any[]): Promise<any>;

    _checkLoggedIn(): void;

    /**
     * parses the response and publishes an event so the corresponding
     * handler can take care of it
     * @param {string} rcvd message
     * @param {TLSSocket} socket socket which received the message
     */
    _parseResponse(rcvd: string, socket: any): void;

    _shutdown(): void;

    /**
     * opens a socket and subscribes to a specific stream yielding its result
     * when the subscription is cancelled (see _stopStreaming) it closes the socket
     * @param {string} customTag
     * @param {string} command
     * @param {Object} args the operation parameters
     * @return {boolean} false if there is an already active subscription to the stream, true
     * once its finished
     */
    _streamOperation(customTag: string, command: string, args?: Object): boolean;

    /**
     * Returns array of all symbols available for the user.
     * @return {Promise<TickerSymbol[]>}
     */
    getAllSymbols(): Promise<TickerSymbol[]>;

    /**
     * Returns calendar with market events.
     * @returns {Promise<Calendar[]>}
     */
    getCalendar(): Promise<Calendar[]>;

    /**
     * Returns chart info, from start date to the current time.
     * Note: streamCandles is the preferred way of retrieving current candle data.
     * @param {XApiClient.Period} period
     * @param {number} start
     * @param {string} symbol
     * @returns {Promise<Candle>}
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
    }>, start: number, symbol: string): Promise<Candle>;

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
    }>, symbol: string, ticks?: number): Promise<Candle>;

    /**
     * Returns calculation of commission and rate of exchange.
     * The value is calculated as expected value, and therefore might not be
     * perfectly accurate.
     * @param {string} tickerSymbol
     * @param {number} volume
     * @returns {Promise<Commission>}
     */
    getCommissionDef(tickerSymbol: string, volume: number): Promise<Commission>;

    /**
     * Returns information about account currency, and account leverage
     * for the current API user
     * @returns {Promise<UserData>}
     */
    getCurrentUserData(): Promise<UserData>;

    /**
     * Returns IBs data from the given time range.
     * @param {number} start (timestamp) Start of IBs history block
     * @param {number} end (timestamp) End of IBs history block
     * @returns {Promise<IB[]>}
     */
    getIbsHistory(start: number, end: number): Promise<IB[]>;

    getMarginLevel(): Promise<any>;

    /**
     * Returns expected margin for given instrument and volume.
     * The value is calculated as expected margin value, and therefore might not
     * be perfectly accurate.
     * @param symbol
     * @param volume
     * @returns {Promise<Margin>}
     */
    getMarginTrade(symbol: any, volume: any): Promise<Margin>;

    /**
     * Returns news from trading server which were sent within specified Period
     * of time.
     * Note: streamNews is the preferred way of retrieving news data.
     * @param {number} start (timestamp)
     * @param {number} end (timestamp)
     * @returns {Promise<News[]>}
     */
    getNews(start: number, end: number): Promise<News[]>;

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
    getProfitCalculation(cmd: Readonly<{
        BUY: number;
        SELL: number;
        BUY_LIMIT: number;
        SELL_LIMIT: number;
        BUY_STOP: number;
        SELL_STOP: number;
        BALANCE: number;
        CREDIT: number;
    }>, symbol: string, volume: number, openPrice: number, closePrice: number): Promise<ProfitCalculation>;

    /**
     * Returns current time on trading server.
     * @returns {Promise<ServerTime>}
     */
    getServerTime(): Promise<ServerTime>;

    /**
     * Returns a list of step rules for DMAs
     * @returns {Promise<StepRule[]>}
     */
    getStepRules(): Promise<StepRule[]>;

    /**
     * Returns information about symbol available for the user.
     * @returns {Promise<TickerSymbol>}
     */
    getSymbol(): Promise<TickerSymbol>;

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
    getTickPrices(level: number, symbols: string[], timestamp: number): Promise<TickPrice[]>;

    /**
     * Returns array of trades listed in orders argument.
     * @param {number[]} orders Array of orders (position numbers)
     * @returns {Promise<Trade[]>}
     */
    getTradeRecords(orders: number[]): Promise<Trade[]>;

    /**
     * Returns array of user's trades
     * Note: streamTrades is the preferred way of retrieving trades data.
     * @param {boolean} openedOnly if true then only open trades will be returned
     * @returns {Promise<Trade[]>}
     */
    getTrades(openedOnly: boolean): Promise<Trade[]>;

    /**
     * Returns array of user's trades which were closed within specified Period
     * of time.
     * Note: streamTrades is the preferred way of retrieving trades data.
     * @param {number} start (timestamp)
     * @param {number} end (timestamp)
     * @returns {Promise<Trade[]>}
     */
    getTradesHistory(start: number, end: number): Promise<Trade[]>;

    /**
     * Returns quotes and trading times.
     * @param {string[]} symbols
     * @returns {Promise<TradingHours[]>}
     */
    getTradingHours(symbols: string[]): Promise<TradingHours[]>;

    /**
     * Returns the current API version.
     * @returns {Promise<Version>}
     */
    getVersion(): Promise<any>;

    /**
     * In order to perform any action client applications have to perform login process.
     * No functionality is available before a successful login.
     * After initial login, a new session is created and all commands can executed by an authenticated
     * user until he/she logs out or drops the connection.
     */
    login(): Promise<boolean>;

    logout(): void;

    ping(): Promise<any>;

    stopStreamBalance(): void;

    stopStreamCandles(symbol: any): void;

    stopStreamKeepAlive(): void;

    stopStreamNews(): void;

    stopStreamProfits(): void;

    stopStreamTickPrices(symbol: any): void;

    stopStreamTradeStatus(): void;

    stopStreamTrades(): void;

    /**
     * Allows to get actual account indicators values in real-time, as soon as they are available in the system.
     * @yields {Balance}
     */
    streamBalance(): AsyncGenerator<any, void, unknown>;

    /**
     * Subscribes to API chart candles. The interval of every candle is 1 minute.
     * A new candle arrives every minute.
     * @param {string} symbol
     * @yields {Candle}
     */
    streamCandles(symbol: string): AsyncGenerator<any, void, unknown>;

    /**
     * Subscribes to 'keep alive' messages.
     * A new 'keep alive' message is sent by the API every 3 seconds
     * @fires XAPIConstants#.STREAM_KEEP_ALIVE
     */
    streamKeepAlive(): AsyncGenerator<any, void, unknown>;

    /**
     * Subscribes to news.
     * @return News
     */
    streamNews(): AsyncGenerator<any, void, unknown>;

    /**
     * Regularly calling this function is enough to refresh the internal state of all the
     * components in the system. Streaming connection, when any command is not sent by
     * client in the session, generates only one way network traffic. It is recommended
     * that any application that does not execute other commands, should call this
     * command at least once every 10 minutes.
     */
    streamPing(): AsyncGenerator<any, void, unknown>;

    /**
     * Subscribes to profits
     * @yields Profit
     */
    streamProfits(): AsyncGenerator<any, void, unknown>;

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
    streamTickPrices(symbol: string, {minArrivalTime, maxLevel}: number): AsyncGenerator<any, void, unknown>;

    /**
     * Allows to get status for sent trade requests in real-time, as soon as it is
     * available in the system. Please beware that when multiple records are available,
     * the order in which they are received is not guaranteed.
     * @fires XAPIConstants#.STREAM_TRADE_STATUS
     */
    streamTradeStatus(): AsyncGenerator<any, void, unknown>;

    /**
     * Establishes subscription for user trade status data and allows to obtain the
     * relevant information in real-time, as soon as it is available in the system.
     * Please beware that when multiple records are available, the order in which
     * they are received is not guaranteed.
     * @see http://developers.xstore.pro/documentation/2.5.0#streamTrades
     * @yields Trade
     */
    streamTrades(): AsyncGenerator<any, void, unknown>;

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
    }>, volume: number): Promise<Order>;

    /**
     * Returns current transaction status. At any time of transaction processing
     * client might check the status of transaction on server side. In order to
     * do that client must provide unique order taken from tradeTransaction.
     * Note: XApiClient#streamTradeStatus is the preferred way of retrieving transaction status data.
     * @param {number} order  order number from tradeTransaction
     * @returns {Promise<TradeStatus>}
     */
    tradeTransactionStatus(order: number): Promise<TradeStatus>;
}

declare namespace XApiClient {
    export {
        Period,
        command,
        quoteId,
        streamTradeStatus,
        streamTradesState,
        tradeType,
        Balance,
        News,
        Candle,
        TickPrice,
        Trade,
        Profit,
        KeepAlive,
        TickerSymbol,
        Calendar,
        ChartInfoRecord,
        rateInfoRecord,
        Commission,
        UserData,
        IB,
        Margin,
        NewsTopicRecord,
        ProfitCalculation,
        Order,
        TradeTransaction,
        ServerTime,
        StepRule,
        Step,
        TradingHours,
        OperatingTime,
        TradeStatus,
        Error
    };
}
type TickerSymbol = {
    /**
     * Bid price in base currency
     */
    bid: number;
    /**
     * Ask price in base currency
     */
    ask: number;
    /**
     * Category name
     */
    categoryName: string;
    /**
     * Size of 1 lot
     */
    contractSize: number;
    /**
     * Currency
     */
    currency: string;
    /**
     * Indicates whether the symbol represents a currency pair
     */
    currencyPair: boolean;
    /**
     * The currency of calculated profit
     */
    currencyProfit: string;
    /**
     * Description
     */
    description: string;
    /**
     * Null if not applicable
     */
    expiration: number;
    /**
     * Symbol group name
     */
    groupName: string;
    /**
     * The highest price of the day in base currency
     */
    high: number;
    /**
     * Initial margin for 1 lot order, used for profit/margin calculation
     */
    initialMargin: number;
    /**
     * Maximum instant volume multiplied by 100 (in lots)
     */
    instantMaxVolume: number;
    /**
     * Symbol leverage
     */
    leverage: number;
    /**
     * Long only
     */
    longOnly: boolean;
    /**
     * Maximum size of trade
     */
    lotMax: number;
    /**
     * Minimum size of trade
     */
    lotMin: number;
    /**
     * A value of minimum step by which the size of trade can be changed (within lotMin - lotMax range)
     */
    lotStep: number;
    /**
     * The lowest price of the day in base currency
     */
    low: number;
    /**
     * Used for profit calculation
     */
    marginHedged: number;
    /**
     * For margin calculation
     */
    marginHedgedStrong: boolean;
    /**
     * For margin calculation, null if not applicable
     */
    marginMaintenance: number;
    /**
     * For margin calculation
     */
    marginMode: number;
    /**
     * Percentage
     */
    percentage: number;
    /**
     * Number of symbol's pip decimal places
     */
    pipsPrecision: number;
    /**
     * Number of symbol's price decimal places
     */
    precision: number;
    /**
     * For profit calculation
     */
    profitMode: number;
    /**
     * Source of price
     */
    quoteId: number;
    /**
     * Indicates whether short selling is allowed on the instrument
     */
    shortSelling: boolean;
    /**
     * The difference between raw ask and bid prices
     */
    spreadRaw: number;
    /**
     * Spread representation
     */
    spreadTable: number;
    /**
     * Null if not applicable
     */
    starting: number;
    /**
     * Appropriate step rule ID from getStepRules command response
     */
    stepRuleId: number;
    /**
     * Minimal distance (in pips) from the current price where the stopLoss/takeProfit can be set
     */
    stopsLevel: number;
    /**
     * number when additional swap is accounted for weekend
     */
    swap_rollover3days: number;
    /**
     * Indicates whether swap value is added to position on end of day
     */
    swapEnable: boolean;
    /**
     * Swap value for long positions in pips
     */
    swapLong: number;
    /**
     * Swap value for short positions in pips
     */
    swapShort: number;
    /**
     * Type of swap calculated
     */
    swapType: number;
    /**
     * Symbol name
     */
    symbol: string;
    /**
     * Smallest possible price change, used for profit/margin calculation, null if not applicable
     */
    tickSize: number;
    /**
     * Value of smallest possible price change (in base currency), used for profit/margin calculation, null if not applicable
     */
    tickValue: number;
    /**
     * Ask & bid tick number
     */
    number: number;
    /**
     * number in String
     */
    numberString: string;
    /**
     * Indicates whether trailing stop (offset) is applicable to the instrument.
     */
    trailingEnabled: boolean;
    /**
     * Instrument class number
     */
    type: number;
};
type Calendar = {
    /**
     * Two letter country code
     */
    country: string;
    /**
     * Market value (current), empty before time of release of this value (time from "time" record)
     */
    current: string;
    /**
     * Forecasted value
     */
    forecast: string;
    /**
     * Impact on market
     */
    impact: string;
    /**
     * Information period
     */
    period: string;
    /**
     * Value from previous information release
     */
    previous: string;
    /**
     * Time, when the information will be released (in this time empty "current" value should be changed with exact released value)
     */
    time: any;
    /**
     * Name of the indicator for which values will be released
     */
    title: string;
};
type Candle = {
    /**
     * Close price in base currency
     */
    close: number;
    /**
     * Candle start time in CET time zone (timestamp)
     */
    ctm: number;
    /**
     * String representation of the ctm field
     */
    ctmString: string;
    /**
     * Highest value in the given period in base currency
     */
    high: number;
    /**
     * Lowest value in the given period in base currency
     */
    low: number;
    /**
     * Open price in base currency
     */
    open: number;
    /**
     * Source of price (only for streaming)
     */
    quoteId: Readonly<{
        FIXED: number;
        FLOAT: number;
        DEPTH: number;
        CROSS: number;
    }>;
    /**
     * Symbol (only for streaming)
     */
    symbol: string;
    /**
     * Volume in lots
     */
    vol: number;
};
type Commission = {
    /**
     * calculated commission in account currency, could be null if not applicable
     */
    commission: number;
    /**
     * rate of exchange between account currency and instrument base currency,
     * could be null if not applicable
     */
    rateOfExchange: number;
};
type UserData = {
    /**
     * Unit the account is assigned to.
     */
    companyUnit: number;
    /**
     * account currency
     */
    currency: string;
    /**
     * group
     */
    group: string;
    /**
     * Indicates whether this account is an IB account.
     */
    ibAccount: boolean;
    /**
     * The factor used for margin calculations.
     * The actual value of leverage can be calculated by dividing this value by 100.
     */
    leverageMultiplier: number;
    /**
     * spreadType, null if not applicable
     */
    spreadType: string;
    /**
     * Indicates whether this account is enabled to use trailing stop.
     */
    trailingStop: boolean;
};
type IB = {
    /**
     * IB close price or null if not allowed to view
     */
    closePrice: number;
    /**
     * IB user login or null if not allowed to view
     */
    login: string;
    /**
     * IB nominal or null if not allowed to view
     */
    nominal: number;
    /**
     * IB open price or null if not allowed to view
     */
    openPrice: number;
    /**
     * Operation code or null if not allowed to view
     */
    side: number;
    /**
     * IB user surname or null if not allowed to view
     */
    surname: string;
    /**
     * Symbol or null if not allowed to view
     */
    symbol: string;
    /**
     * Time the record was created or null if not allowed to view
     */
    timestamp: number;
    /**
     * Volume in lots or null if not allowed to view
     */
    volume: number;
};
type Margin = {
    margin: number;
};
type News = {
    /**
     * Body
     */
    body: string;
    /**
     * News key
     */
    key: string;
    /**
     * Time (timestamp)
     */
    time: number;
    /**
     * News title
     */
    title: string;
};
type ProfitCalculation = {
    profit: number;
};
type ServerTime = {
    /**
     * Timestamp
     */
    timstamp: number;
    /**
     * Textual representation of the timestamp
     */
    timeString: string;
};
type StepRule = {
    /**
     * Step rule ID
     */
    id: number;
    /**
     * Step rule name
     */
    name: string;
    Steps: Step[];
};
type TickPrice = {
    /**
     * Ask price in base currency
     */
    ask: number;
    /**
     * Number of available lots to buy at given price or null if not applicable
     */
    askVolume: number;
    /**
     * Bid price in base currency
     */
    bid: number;
    /**
     * Number of available lots to buy at given price or null if not applicable
     */
    bidVolume: number;
    /**
     * The highest price of the day in base currency
     */
    high: number;
    /**
     * Price level
     */
    level: number;
    /**
     * The lowest price of the day in base currency
     */
    low: number;
    /**
     * Source of price, detailed description below
     */
    quoteId: Readonly<{
        FIXED: number;
        FLOAT: number;
        DEPTH: number;
        CROSS: number;
    }>;
    /**
     * The difference between raw ask and bid prices
     */
    spreadRaw: number;
    /**
     * Spread representation
     */
    spreadTable: number;
    /**
     * Symbol
     */
    symbol: string;
    /**
     * Timestamp
     */
    timestamp: number;
};
type Trade = {
    /**
     * Close price in base currency
     */
    close_price: number;
    /**
     * Null if order is not closed
     */
    close_time: number;
    /**
     * Closed
     */
    closed: boolean;
    /**
     * Operation code
     */
    cmd: Readonly<{
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
     * Comment
     */
    comment: string;
    /**
     * Commission in account currency, null if not applicable
     */
    commission: number;
    /**
     * The value the customer may provide in order to retrieve it later.
     */
    customComment: string;
    /**
     * Number of decimal places
     */
    digits: number;
    /**
     * Null if order is not closed
     */
    expiration: number;
    /**
     * Margin rate
     */
    margin_rate: number;
    /**
     * Trailing offset
     */
    offset: number;
    /**
     * Open price in base currency
     */
    open_price: number;
    /**
     * Open time
     */
    open_time: number;
    /**
     * Order number for opened transaction
     */
    order: number;
    /**
     * Transaction id
     */
    order2: number;
    /**
     * Position number (if type is 0 and 2) or transaction parameter (if type is 1)
     */
    position: number;
    /**
     * null unless the trade is closed (type=2) or opened (type=0)
     */
    profit: number;
    /**
     * Zero if stop loss is not set (in base currency)
     */
    sl: number;
    /**
     * Trade state, should be used for detecting pending order's cancellation (only in streamTrades)
     */
    state: string;
    /**
     * Storage
     */
    storage: number;
    /**
     * Symbol
     */
    symbol: string;
    /**
     * Zero if take profit is not set (in base currency)
     */
    tp: number;
    /**
     * type (only in streamTrades)
     */
    type: number;
    /**
     * Volume in lots
     */
    volume: number;
    /**
     * Timestamp (only in getTrades)
     */
    timestamp: number;
};
type TradingHours = {
    /**
     * Quotes records
     */
    quotes: OperatingTime[];
    /**
     * Symbol
     */
    symbol: string;
    /**
     * of Trading records
     */
    trading: OperatingTime[];
};
type Order = {
    order: number;
};
type TradeStatus = {
    /**
     * The value the customer may provide in order to retrieve it later.
     */
    customComment: string;
    /**
     * Can be null
     */
    message: string;
    /**
     * Unique order number
     */
    order: number;
    /**
     * Price in base currency
     */
    price: number;
    /**
     * Request status code, described below
     */
    requestStatus: number;
};
declare var Period: Readonly<{
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
declare var command: Readonly<{
    BUY: number;
    SELL: number;
    BUY_LIMIT: number;
    SELL_LIMIT: number;
    BUY_STOP: number;
    SELL_STOP: number;
    BALANCE: number;
    CREDIT: number;
}>;
declare var quoteId: Readonly<{
    FIXED: number;
    FLOAT: number;
    DEPTH: number;
    CROSS: number;
}>;
declare var streamTradeStatus: Readonly<{
    ERROR: number;
    PENDING: number;
    ACCEPTED: number;
    REJECTED: number;
}>;
declare var streamTradesState: Readonly<{
    MODIFIED: string;
    DELETED: string;
}>;
declare var tradeType: Readonly<{
    OPEN: number;
    PENDING: number;
    CLOSE: number;
    MODIFY: number;
    DELETE: number;
}>;
type Balance = {
    /**
     * balance in account currency
     */
    balance: number;
    /**
     * credit in account currency
     */
    credit: number;
    /**
     * user currency  (only in getMarginLevel)
     */
    currency: string;
    /**
     * sum of balance and all profits in account currency
     */
    equity: number;
    /**
     * margin requirements
     */
    margin: number;
    /**
     * free margin
     */
    marginFree: number;
    /**
     * margin level percentage
     */
    marginLevel: number;
};
type Profit = {
    /**
     * Order number
     */
    order: number;
    /**
     * Transaction ID
     */
    order2: number;
    /**
     * Position number
     */
    position: number;
    /**
     * Profit in account currency
     */
    profit: number;
};
type KeepAlive = {
    /**
     * Current Timestamp
     */
    timestamp: number;
};
type ChartInfoRecord = {
    digits: number;
    rateInfos: rateInfoRecord[];
};
type rateInfoRecord = {
    /**
     * Value of close price (shift from open price)
     */
    close: number;
    /**
     * Candle start time in CET / CEST time zone (see Daylight Saving Time, DST)
     */
    ctm: number;
    /**
     * Highest value in the given period (shift from open price)
     */
    high: number;
    /**
     * Lowest value in the given period (shift from open price)
     */
    low: number;
    /**
     * Open price (in base currency * 10 to the power of digits)
     */
    open: number;
    /**
     * Volume in lots
     */
    vol: number;
};
type NewsTopicRecord = {
    /**
     * Body
     */
    body: string;
    /**
     * Body length
     */
    bodylen: number;
    /**
     * News key
     */
    key: string;
    /**
     * Time (timestamp)
     */
    time: number;
    /**
     * Time string
     */
    timeString: string;
    /**
     * News title
     */
    title: string;
};
type TradeTransaction = {
    /**
     * Operation code
     */
    cmd: number;
    /**
     * The value the customer may provide in order to retrieve it later.
     */
    customComment: string;
    /**
     * Pending order expiration time
     */
    expiration: number;
    /**
     * Trailing offset
     */
    offset: number;
    /**
     * 0 or position number for closing/modifications
     */
    order: number;
    /**
     * Trade price
     */
    price: number;
    /**
     * Stop loss
     */
    sl: number;
    /**
     * Trade symbol
     */
    symbol: string;
    /**
     * Take profit
     */
    tp: number;
    /**
     * Trade transaction type
     */
    type: number;
    /**
     * Trade volume
     */
    volume: number;
};
type Step = {
    /**
     * Lower border of the volume range
     */
    fromValue: number;
    /**
     * lotStep value in the given volume range
     */
    step: number;
};
type OperatingTime = {
    /**
     * Day of week (1 = Monday, 7 = Sunday)
     */
    day: number;
    /**
     * Start time in ms from 00:00 CET / CEST (timestamp)
     */
    fromT: number;
    /**
     * End time in ms from 00:00 CET / CEST (timestamp)
     */
    toT: number;
};
type Error = {
    code: string;
    message: string;
};
