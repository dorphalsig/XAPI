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
     * Asynchronous Constructor
     * @param {string} username
     * @param {string} password
     * @param {boolean} isDemo
     */
    constructor(username: string, password: string, isDemo: boolean);

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
     * @param {Object} args the operation parameter;
     * @return {Promise<*>}
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
     * @param {ChartInfo} chartInfo
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
     * @yields {AsyncGenerator<*>} the received data
     * @private
     */
    private _streamOperation;
    /**
     * Returns array of all symbols available for the user.
     * @return {Promise<TickerSymbol[]>}
     */
    getAllSymbols(): Promise<TickerSymbol[]>;

    #private;

    /**
     * Returns calendar with market events.
     * @return {Promise<Calendar[]>}
     */
    getCalendar(): Promise<Calendar[]>;

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
    }>, start: number, symbol: string): Promise<Candle[]>;

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
    }>, symbol: string, ticks?: number): Promise<Candle[]>;

    /**
     * Returns calculation of commission and rate of exchange.
     * The value is calculated as expected value, and therefore might not be
     * perfectly accurate.
     * @param {string} tickerSymbol
     * @param {number} volume
     * @return {Promise<Commission>}
     */
    getCommissionDef(tickerSymbol: string, volume: number): Promise<Commission>;

    /**
     * Returns information about account currency, and account leverage
     * for the current API user
     * @return {Promise<UserData>}
     */
    getCurrentUserData(): Promise<UserData>;

    /**
     * Returns IBs data from the given time range.
     * @param {number} start (timestamp) Start of IBs history block
     * @param {number} end (timestamp) End of IBs history block
     * @return {Promise<IB[]>}
     */
    getIbsHistory(start: number, end: number): Promise<IB[]>;

    /**
     * Returns various account indicators
     * streamBalance is the preferred way of retrieving account indicators
     * @return {Promise<Balance>}
     */
    getMarginLevel(): Promise<Balance>;

    /**
     * Returns expected margin for given instrument and volume.
     * The value is calculated as expected margin value, and therefore might not
     * be perfectly accurate.
     * @param {string} symbol
     * @param {number} volume
     * @return {Promise<Margin>}
     */
    getMarginTrade(symbol: string, volume: number): Promise<Margin>;

    /**
     * Returns news from trading server which were sent within specified Period
     * of time.
     * Note: streamNews is the preferred way of retrieving news data.
     * @param {number} start (timestamp)
     * @param {number} end (timestamp)
     * @return {Promise<News[]>}
     */
    getNews(start: number, end: number): Promise<News[]>;

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
    }>, symbol: string, volume: number, openPrice: number, closePrice: number): Promise<ProfitCalculation>;

    /**
     * Returns current time on trading server.
     * @return {Promise<ServerTime>}
     */
    getServerTime(): Promise<ServerTime>;

    /**
     * Returns a list of step rules for DMAs
     * @return {Promise<StepRule[]>}
     */
    getStepRules(): Promise<StepRule[]>;

    /**
     * Returns information about symbol available for the user.
     * @return {Promise<TickerSymbol>}
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
     * @return {Promise<TickPrice[]>}
     * @see http://developers.xstore.pro/documentation/#getTickPrices
     */
    getTickPrices(level: number, symbols: string[], timestamp: number): Promise<TickPrice[]>;

    /**
     * Returns array of trades listed in orders argument.
     * @param {number[]} orders Array of orders (position numbers)
     * @return {Promise<Trade[]>}
     */
    getTradeRecords(orders: number[]): Promise<Trade[]>;

    /**
     * Returns array of user's trades
     * Note: streamTrades is the preferred way of retrieving trades data.
     * @param {boolean} openedOnly if true then only open trades will be returned
     * @return {Promise<Trade[]>}
     */
    getTrades(openedOnly: boolean): Promise<Trade[]>;

    /**
     * Returns array of user's trades which were closed within specified Period
     * of time.
     * Note: streamTrades is the preferred way of retrieving trades data.
     * @param {number} start (timestamp)
     * @param {number} end (timestamp)
     * @return {Promise<Trade[]>}
     */
    getTradesHistory(start: number, end: number): Promise<Trade[]>;

    /**
     * Returns quotes and trading times.
     * @param {string[]} symbols
     * @return {Promise<TradingHours[]>}
     */
    getTradingHours(symbols: string[]): Promise<TradingHours[]>;

    /**
     * Returns the current API version.
     * @return {Promise<Version>}
     */
    getVersion(): Promise<Version>;

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
     * Allows to get actual account indicators values in real-time, as soon as
     * they are available in the system.
     * @yields {Balance}
     */
    streamBalance(): AsyncGenerator<any, void, unknown>;

    /**
     * Subscribes to news.
     * @return {News}
     */
    streamNews(): News;

    /**
     * Subscribes to profits
     * @yields Profit
     */
    streamProfits(): AsyncGenerator<any, void, unknown>;

    /**
     * Regularly calling this function is enough to refresh the internal state of
     * all the components in the system. Streaming connection, when any command
     * is not sent by client in the session, generates only one way network
     * traffic. It is recommended that any application that does not execute
     * other commands, should call this command at least once every 10 minutes.
     */
    streamPing(): AsyncGenerator<any, void, unknown>;

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
    streamTickPrices(symbol: string, {minArrivalTime, maxLevel}: {
        minArrivalTime: number;
        maxLevel: number;
    }): AsyncGenerator<never, AsyncGenerator<any, void, unknown>, unknown>;

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
    }>, volume: number): Promise<Order>;

    /**
     * Returns current transaction status. At any time of transaction processing
     * client might check the status of transaction on server side. In order to
     * do that client must provide unique order taken from tradeTransaction.
     * Note: XApiClient#streamTradeStatus is the preferred way of retrieving
     * transaction status data.
     * @param {number} order  order number from tradeTransaction
     * @return {Promise<TradeStatus>}
     */
    tradeTransactionStatus(order: number): Promise<TradeStatus>;
}
export type Balance = {};
export type News = {};
export type Candle = {};
export type TickPrice = {};
export type Trade = {};
export type Profit = {
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
export type KeepAlive = {
    /**
     * Current Timestamp
     */
    timestamp: number;
};
export type TickerSymbol = {
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
     * Indicates whether the symbol represents a
     * currency pair
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
     * Initial margin for 1 lot order, used for
     * profit/margin calculation
     */
    initialMargin: number;
    /**
     * Maximum instant volume multiplied by 100
     * (in lots)
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
     * A value of minimum step by which the size of
     * trade can be changed (within lotMin - lotMax range)
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
     * For margin calculation, null if not
     * applicable
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
     * Indicates whether short selling is allowed
     * on the instrument
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
     * Appropriate step rule ID from getStepRules
     * command response
     */
    stepRuleId: number;
    /**
     * Minimal distance (in pips) from the current
     * price where the stopLoss/takeProfit can be set
     */
    stopsLevel: number;
    /**
     * number when additional swap is
     * accounted for weekend
     */
    swap_rollover3days: number;
    /**
     * Indicates whether swap value is added to
     * position on end of day
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
     * Smallest possible price change, used for
     * profit/margin calculation, null if not applicable
     */
    tickSize: number;
    /**
     * Value of smallest possible price change (in
     * base currency), used for profit/margin calculation, null if not
     * applicable
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
     * Indicates whether trailing stop (offset)
     * is applicable to the instrument.
     */
    trailingEnabled: boolean;
    /**
     * Instrument class number
     */
    type: number;
};
export type Calendar = {
    /**
     * Two letter country code
     */
    country: string;
    /**
     * Market value (current), empty before time of
     * release of this value (time from "time" record)
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
     * Time, when the information will be released (in this
     * time empty "current" value should be changed with exact released value)
     */
    time: any;
    /**
     * Name of the indicator for which values will be
     * released
     */
    title: string;
};
export type ChartInfoRecord = {};
export type rateInfoRecord = {
    /**
     * Value of close price (shift from open price)
     */
    close: number;
    /**
     * Candle start time in CET / CEST time zone (see
     * Daylight Saving Time, DST)
     */
    ctm: number;
    /**
     * Highest value in the given period (shift from open
     * price)
     */
    high: number;
    /**
     * Lowest value in the given period (shift from open
     * price)
     */
    low: number;
    /**
     * Open price (in base currency * 10 to the power of
     * digits)
     */
    open: number;
    /**
     * Volume in lots
     */
    vol: number;
};
export type Commission = {
    /**
     * calculated commission in account currency,
     * could be null if not applicable
     */
    commission: number;
    /**
     * rate of exchange between account currency
     * and instrument base currency, could be null if not applicable
     */
    rateOfExchange: number | null;
};
export type UserData = {
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
     * Indicates whether this account is an IB
     * account.
     */
    ibAccount: boolean;
    /**
     * The factor used for margin
     * calculations. The actual value of leverage can be calculated by dividing
     * this value by 100.
     */
    leverageMultiplier: number;
    /**
     * spreadType, null if not applicable
     */
    spreadType: string;
    /**
     * Indicates whether this account is enabled
     * to use trailing stop.
     */
    trailingStop: boolean;
};
export type IB = {
    /**
     * IB close price or null if not allowed to
     * view
     */
    closePrice: number | null;
    /**
     * IB user login or null if not allowed to view
     */
    login: string | null;
    /**
     * IB nominal or null if not allowed to view
     */
    nominal: number | null;
    /**
     * IB open price or null if not allowed to
     * view
     */
    openPrice: number | null;
    /**
     * Operation code or null if not allowed to view
     */
    side: number | null;
    /**
     * IB user surname or null if not allowed to
     * view
     */
    surname: string | null;
    /**
     * Symbol or null if not allowed to view
     */
    symbol: string | null;
    /**
     * Time the record was created or null if not
     * allowed to view
     */
    timestamp: number | null;
    /**
     * Volume in lots or null if not allowed to
     * view
     */
    volume: number | null;
};
export type Margin = {
    margin: number;
};
export type NewsTopicRecord = {
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
export type ProfitCalculation = {
    profit: number;
};
export type Order = {
    order: number;
};
export type TradeTransaction = {
    /**
     * Operation code
     */
    cmd: number;
    /**
     * The value the customer may provide in
     * order to retrieve it later.
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
export type ServerTime = {
    /**
     * Timestamp
     */
    timstamp: number;
    /**
     * Textual representation of the timestamp
     */
    timeString: string;
};
export type StepRule = {
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
export type Step = {
    /**
     * Lower border of the volume range
     */
    fromValue: number;
    /**
     * lotStep value in the given volume range
     */
    step: number;
};
export type TradingHours = {
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
export type OperatingTime = {
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
export type TradeStatus = {
    /**
     * The value the customer may provide in order
     * to retrieve it later.
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
export type ChartInfo = {
    /**
     * Number of decimal places
     */
    digits: number;
    rateInfos: RateInfoRecord[];
};
export type RateInfoRecord = {
    /**
     * instrument symbol
     */
    symbol: string;
    /**
     * Value of close price (shift from open price)
     */
    close: number;
    /**
     * Candle start time in CET / CEST time zone (see
     * Daylight Saving Time, DST)
     */
    ctm: number;
    /**
     * String representation of the 'ctm' field
     */
    ctmString: string;
    /**
     * Highest value in the given period (shift from open
     * price)
     */
    high: number;
    /**
     * Lowest value in the given period (shift from open
     * price)
     */
    low: number;
    /**
     * Open price (in base currency * 10 to the power of
     * digits)
     */
    open: number;
    /**
     * Volume in lots
     */
    vol: number;
};
export type Version = {
    /**
     * version string
     */
    version: string;
};
