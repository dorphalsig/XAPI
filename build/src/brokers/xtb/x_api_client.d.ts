/**
 * Javascript Implementation of the API to call remote operations on the XTB/X
 * Open Hub xStation 5 platform
 * @version 2.5.0
 * @see http://developers.xstore.pro/documentation/2.5.0
 * @todo define a maximum amount of messages/s that can go in a single
 *     streaming socket and then have the sockets identify if a new one must be
 *     opened
 */
export declare class XApiClient {
    #private;
    isLoggedIn: boolean;
    constructor(username: string, password: string, isDemo: boolean);
    private static processChartRequest;
    /**
     * Returns array of all symbols available for the user.
     * @return
     */
    getAllSymbols(): Promise<XApiClient.TickerSymbol[]>;
    /**
     * Returns calendar with market events.
     * @return
     */
    getCalendar(): Promise<XApiClient.Calendar[]>;
    /**
     * Returns chart info, from start date to the current time.
     * Note: streamCandles is the preferred way of retrieving current candle data.
     * @param period
     * @param start
     * @param symbol
     * return {Promise<Candle[]>}
     * @see http://developers.xstore.pro/documentation/#getChartLastRequest
     */
    getChartLastRequest(period: XApiClient.Period, start: number, symbol: string): Promise<XApiClient.Candle[]>;
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
    getChartRangeRequest(start: number, end: number, period: XApiClient.Period, symbol: string, ticks?: number): Promise<XApiClient.Candle[]>;
    /**
     * Returns calculation of commission and rate of exchange.
     * The value is calculated as expected value, and therefore might not be
     * perfectly accurate.
     * @param tickerSymbol
     * @param volume
     * @return
     */
    getCommissionDef(tickerSymbol: string, volume: number): Promise<XApiClient.Commission>;
    /**
     * Returns information about account currency, and account leverage
     * for the current API user
     * @return
     */
    getCurrentUserData(): Promise<XApiClient.UserData>;
    /**
     * Returns IBs data from the given time range.
     * @param start (timestamp) Start of IBs history block
     * @param end (timestamp) End of IBs history block
     * @return
     */
    getIbsHistory(start: number, end: number): Promise<XApiClient.IB[]>;
    /**
     * Returns various account indicators
     * streamBalance is the preferred way of retrieving account indicators
     * @return
     */
    getMarginLevel(): Promise<XApiClient.Balance>;
    /**
     * Returns expected margin for given instrument and volume.
     * The value is calculated as expected margin value, and therefore might not
     * be perfectly accurate.
     * @param symbol
     * @param volume
     * @return
     */
    getMarginTrade(symbol: string, volume: number): Promise<XApiClient.Margin>;
    /**
     * Returns news from trading server which were sent within specified Period
     * of time.
     * Note: streamNews is the preferred way of retrieving news data.
     * @param start (timestamp)
     * @param end (timestamp)
     * @return
     */
    getNews(start: number, end: number): Promise<XApiClient.News[]>;
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
    getProfitCalculation(cmd: XApiClient.Command, symbol: string, volume: number, openPrice: number, closePrice: number): Promise<XApiClient.ProfitCalculation>;
    /**
     * Returns current time on trading server.
     * @return
     */
    getServerTime(): Promise<XApiClient.ServerTime>;
    /**
     * Returns a list of step rules for DMAs
     * @return
     */
    getStepRules(): Promise<XApiClient.StepRule[]>;
    /**
     * Returns information about symbol available for the user.
     * @return
     */
    getSymbol(): Promise<XApiClient.TickerSymbol>;
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
    getTickPrices(level: number, symbols: string, timestamp: number): Promise<XApiClient.TickPrice[]>;
    /**
     * Returns array of trades listed in orders argument.
     * @param orders Array of orders (position numbers)
     * @return
     */
    getTradeRecords(orders: number[]): Promise<XApiClient.Trade[]>;
    /**
     * Returns array of user's trades
     * Note: streamTrades is the preferred way of retrieving trades data.
     * @param openedOnly if true then only open trades will be returned
     * @return
     */
    getTrades(openedOnly: boolean): Promise<XApiClient.Trade[]>;
    /**
     * Returns array of user's trades which were closed within specified Period
     * of time.
     * Note: streamTrades is the preferred way of retrieving trades data.
     * @param start (timestamp)
     * @param end (timestamp)
     * @return
     */
    getTradesHistory(start: number, end: number): Promise<XApiClient.Trade[]>;
    /**
     * Returns quotes and trading times.
     * @param symbols
     * @return
     */
    getTradingHours(symbols: string[]): Promise<XApiClient.TradingHours[]>;
    /**
     * Returns the current API version.
     * @return
     */
    getVersion(): Promise<XApiClient.APIVersion>;
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
     * that does not execute other commands, should call this Command at least
     * once every 10 minutes.
     */
    ping(): void;
    /**
     * stops streaming Balance
     */
    stopStreamBalance(): void;
    /**
     * stops streaming candles for the specified symbol
     * @param symbol
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
     * @param symbol
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
     * @yields
     */
    streamBalance(): AsyncGenerator<XApiClient.Balance>;
    /**
     * Subscribes to API chart candles. The interval of every candle is 1 minute.
     * A new candle arrives every minute.
     * @param symbol
     * @yields
     */
    streamCandles(symbol: string): AsyncGenerator<XApiClient.Candle>;
    /**
     * Subscribes to 'keep alive' messages.
     * A new 'keep alive' message is sent by the API every 3 seconds
     */
    streamKeepAlive(): AsyncGenerator<XApiClient.KeepAlive>;
    /**
     * Subscribes to news.
     * @return
     */
    streamNews(): AsyncGenerator<XApiClient.News>;
    /**
     * Regularly calling this function is enough to refresh the internal state of
     * all the components in the system. Streaming connection, when any Command
     * is not sent by client in the session, generates only one way network
     * traffic. It is recommended that any application that does not execute
     * other commands, should call this Command at least once every 10 minutes.
     */
    streamPing(): AsyncGenerator<XApiClient.KeepAlive>;
    /**
     * Subscribes to profits
     * @yields Profit
     */
    streamProfits(): AsyncGenerator<XApiClient.Profit>;
    /**
     * Establishes subscription for quotations and allows to obtain the relevant
     * information in real-time, as soon as it is available in the system. The
     * getTickPrices Command can be invoked many times for the same symbol, but
     * only one subscription for a given symbol will be created. Please beware
     * that when multiple records are available, the order in which they are
     * received is not guaranteed. minArrivalTime
     */
    streamTickPrices(symbol: string, { minArrivalTime, maxLevel }: {
        minArrivalTime: number;
        maxLevel: number;
    }): AsyncGenerator<XApiClient.TickPrice>;
    /**
     * Allows to get status for sent trade requests in real-time, as soon as it
     * is
     * available in the system. Please beware that when multiple records are
     * available, the order in which they are received is not guaranteed.
     */
    streamTradeStatus(): AsyncGenerator<XApiClient.TradeStatus>;
    /**
     * Establishes subscription for user trade status data and allows to obtain
     * the relevant information in real-time, as soon as it is available in the
     * system. Please beware that when multiple records are available, the order
     * in which they are received is not guaranteed.
     * @see http://developers.xstore.pro/documentation/2.5.0#streamTrades
     * @yields Trade
     */
    streamTrades(): AsyncGenerator<XApiClient.Trade>;
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
    tradeTransaction(cmd: XApiClient.Command, customComment: string, expiration: number, offset: number, order: number, price: number, sl: number, symbol: string, tp: number, type: XApiClient.TradeType, volume: number): Promise<XApiClient.Order>;
    /**
     * Returns current transaction status. At any time of transaction processing
     * client might check the status of transaction on server side. In order to
     * do that client must provide unique order taken from tradeTransaction.
     * Note: XApiClient#StreamTradeStatus is the preferred way of retrieving
     * transaction status data.
     * @param order  order number from tradeTransaction
     * @return
     */
    tradeTransactionStatus(order: number): Promise<XApiClient.TradeStatus>;
    /**
     * Generic method that sends a message to the server and (asynchronously)
     * waits for a reply
     */
    private callOperation;
    /**
     * checks if a user is logged in, throws error if not
     * @private
     */
    private checkLoggedIn;
    /**
     * opens a socket and connects to the XTB/ XOpen Hub Server
     * @param name the name of the socket, this will be used to route
     * the async messages. Basically each streaming message has its own dedicated
     *     socket
     * @param endpoint WSS endpoint
     */
    private connectSocket;
    /**
     * parses the response and publishes an event so the corresponding
     * handler can take care of it
     * @param rcvd message
     * @param socket socket which received the message
     * @private
     */
    private parseResponse;
    /**
     * generic method to stop streaming a Command
     * @param customTag
     * @param stopCommand
     * @param args
     * @return
     * @private
     */
    private stopStreaming;
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
    private streamOperation;
}
export declare namespace XApiClient {
    enum Period {
        /** 1 minute */
        PERIOD_M1 = 1,
        /** 5 minutes */
        PERIOD_M5 = 5,
        /** 15 minutes */
        PERIOD_M15 = 15,
        /** 30 minutes */
        PERIOD_M30 = 30,
        /** 1 hour */
        PERIOD_H1 = 60,
        /** 4 hours */
        PERIOD_H4 = 240,
        /** 1 day */
        PERIOD_D1 = 1440,
        /** 1 week */
        PERIOD_W1 = 10080,
        /** 30 days */
        PERIOD_MN1 = 43200
    }
    enum Command {
        BUY = 0,
        SELL = 1,
        BUY_LIMIT = 2,
        SELL_LIMIT = 3,
        BUY_STOP = 4,
        SELL_STOP = 5,
        BALANCE = 6,
        CREDIT = 7
    }
    enum QuoteId {
        FIXED = 1,
        FLOAT = 2,
        DEPTH = 3,
        CROSS = 4
    }
    enum StreamTradeStatus {
        ERROR = 0,
        PENDING = 1,
        ACCEPTED = 3,
        REJECTED = 4
    }
    enum StreamTradesState {
        MODIFIED = "modified",
        DELETED = "deleted"
    }
    enum TradeType {
        OPEN = 0,
        PENDING = 1,
        CLOSE = 2,
        MODIFY = 3,
        DELETE = 4
    }
    class Balance {
        /** balance in account currency */
        balance: number;
        /** credit in account currency */
        credit: number;
        /** user currency  (only in getMarginLevel) */
        currency?: string;
        /** sum of balance and all profits in account currency */
        equity: number;
        /** margin requirements */
        margin: number;
        /** free margin */
        marginFree: number;
        /** margin level percentage */
        marginLevel: number;
    }
    class News {
        /** Body */
        body: string;
        /** News key */
        key: string;
        /** Time (timestamp) */
        time: number;
        /** News title */
        title: string;
    }
    class TickPrice {
        /** Ask price in base currency */
        ask: number;
        /** Number of available lots to buy at given price or null if not applicable */
        askVolume: number;
        /** Bid price in base currency */
        bid: number;
        /** Number of available lots to buy at given price or null if not applicable */
        bidVolume: number;
        /** The highest price of the day in base currency */
        high: number;
        /** Price level */
        level: number;
        /** The lowest price of the day in base currency */
        low: number;
        /** Source of price, detailed description below */
        quoteId?: XApiClient.QuoteId;
        /** The difference between raw ask and bid prices */
        spreadRaw: number;
        /** Spread representation */
        spreadTable: number;
        /** Symbol */
        symbol: string;
        /** Timestamp */
        timestamp: number;
    }
    class Trade {
        /** Close price in base currency */
        close_price: number;
        /** Null if order is not closed */
        close_time?: number;
        /** Closed */
        closed: boolean;
        /** Operation code */
        cmd: XApiClient.Command;
        /** Comment */
        comment: string;
        /** Commission in account currency, null if not applicable */
        commission?: number;
        /** The value the customer may provide in order to retrieve it later. */
        customComment?: string;
        /** Number of decimal places */
        digits: number;
        /** Null if order is not closed */
        expiration?: number;
        /** Margin rate */
        margin_rate: number;
        /** Trailing offset */
        offset: number;
        /** Open price in base currency */
        open_price: number;
        /** Open time */
        open_time: number;
        /** Order number for opened transaction */
        order: number;
        /** Transaction id */
        order2: number;
        /** Position number (if type is 0 and 2) or transaction parameter (if type is 1) */
        position: number;
        /** null unless the trade is closed (type=2) or opened (type=0) */
        profit?: number;
        /** Zero if stop loss is not set (in base currency) */
        sl: number;
        /** Trade state, should be used for detecting pending order's cancellation (only in streamTrades) */
        state?: string;
        /** Storage */
        storage: number;
        /** Symbol */
        symbol: string;
        /** Zero if take profit is not set (in base currency) */
        tp: number;
        /** type (only in streamTrades) */
        type?: number;
        /** Volume in lots */
        volume: number;
        /** Timestamp (only in getTrades) */
        timestamp?: number;
        nominalValue: number;
        spread: number;
        taxes: number;
    }
    class Profit {
        /** Order number */
        order: number;
        /** Transaction ID */
        order2: number;
        /** Position number */
        position: number;
        /** Profit in account currency */
        profit: number;
    }
    class KeepAlive {
        /** Current Timestamp */
        timestamp: number;
    }
    class TickerSymbol {
        /** Bid price in base currency */
        bid: number;
        /** Ask price in base currency */
        ask: number;
        /** Category name */
        categoryName: string;
        /** Size of 1 lot */
        contractSize: number;
        /** Currency */
        currency: string;
        /** Indicates whether the symbol represents a currency pair */
        currencyPair: boolean;
        /** The currency of calculated profit */
        currencyProfit: string;
        /** Description */
        description: string;
        /** Null if not applicable */
        expiration: number;
        /** Symbol group name */
        groupName: string;
        /** The highest price of the day in base currency */
        high: number;
        /** Initial margin for 1 lot order, used for profit/margin calculation */
        initialMargin: number;
        /** Maximum instant volume multiplied by 100 (in lots) */
        instantMaxVolume: number;
        /** Symbol leverage */
        leverage: number;
        /** Long only */
        longOnly: boolean;
        /** Maximum size of trade */
        lotMax: number;
        /** Minimum size of trade */
        lotMin: number;
        /** A value of minimum step by which the size of trade can be changed (within lotMin - lotMax range) */
        lotStep: number;
        /** The lowest price of the day in base currency */
        low: number;
        /** Used for profit calculation */
        marginHedged: number;
        /** For margin calculation */
        marginHedgedStrong: boolean;
        /** For margin calculation, null if not applicable */
        marginMaintenance: number;
        /** For margin calculation */
        marginMode: number;
        /** Percentage */
        percentage: number;
        /** Number of symbol's pip decimal places */
        pipsPrecision: number;
        /** Number of symbol's price decimal places */
        precision: number;
        /** For profit calculation */
        profitMode: number;
        /** Source of price */
        quoteId: number;
        /** Indicates whether short selling is allowed on the instrument */
        shortSelling: boolean;
        /** The difference between raw ask and bid prices */
        spreadRaw: number;
        /** Spread representation */
        spreadTable: number;
        /** Null if not applicable */
        starting: number;
        /** Appropriate step rule ID from getStepRules Command response */
        stepRuleId: number;
        /** Minimal distance (in pips) from the current price where the stopLoss/takeProfit can be set */
        stopsLevel: number;
        /** number when additional swap is accounted for weekend */
        swap_rollover3days: number;
        /** Indicates whether swap value is added to position on end of day */
        swapEnable: boolean;
        /** Swap value for long positions in pips */
        swapLong: number;
        /** Swap value for short positions in pips */
        swapShort: number;
        /** Type of swap calculated */
        swapType: number;
        /** Symbol name */
        symbol: string;
        /** Smallest possible price change, used for profit/margin calculation, null if not applicable */
        tickSize: number;
        /** Value of smallest possible price change (in base currency), used for profit/margin calculation, null if not applicable */
        tickValue: number;
        /** Ask & bid tick number */
        number: number;
        /** number in String */
        numberString: string;
        /** Indicates whether trailing stop (offset) is applicable to the instrument. */
        trailingEnabled: boolean;
        /** Instrument export class number */
        type: number;
    }
    class Calendar {
        /** Two letter country code */
        country: string;
        /** Market value (current), empty before time of release of this value (time from "time" record) */
        current: string;
        /** Forecasted value */
        forecast: string;
        /** Impact on market */
        impact: string;
        /** Information period */
        period: string;
        /** Value from previous information release */
        previous: string;
        /** Time, when the information will be released (in this time empty "current" value should be changed with exact released value) */
        time: number;
        /** Name of the indicator for which values will be released */
        title: string;
    }
    class ChartInfoRecord {
        digits: number;
        rateInfos: RateInfoRecord[];
    }
    class Commission {
        /** calculated commission in account currency, could be null if not applicable */
        commission: number;
        /** rate of exchange between account currency and instrument base currency, could be null if not applicable */
        rateOfExchange?: number;
    }
    class UserData {
        /** Unit the account is assigned to. */
        companyUnit: number;
        /** account currency */
        currency: string;
        /** group */
        group: string;
        /** Indicates whether this account is an IB account. */
        ibAccount: boolean;
        /** The factor used for margin calculations. The actual value of leverage can be calculated by dividing this value by 100. */
        leverageMultiplier: number;
        /** spreadType, null if not applicable */
        spreadType: string;
        /** Indicates whether this account is enabled to use trailing stop. */
        trailingStop: boolean;
    }
    class IB {
        /** IB close price or null if not allowed to view */
        closePrice?: number;
        /** IB user login or null if not allowed to view */
        login?: string;
        /** IB nominal or null if not allowed to view */
        nominal?: number;
        /** IB open price or null if not allowed to view */
        openPrice?: number;
        /** Operation code or null if not allowed to view */
        side?: number;
        /** IB user surname or null if not allowed to view */
        surname?: string;
        /** Symbol or null if not allowed to view */
        symbol?: string;
        /** Time the record was created or null if not allowed to view */
        timestamp?: number;
        /**  Volume in lots or null if not allowed to view */
        volume?: number;
    }
    class Margin {
        margin: number;
    }
    class NewsTopicRecord {
        /** Body */
        body: string;
        /** Body length */
        bodylen: number;
        /** News key */
        key: string;
        /** Time (timestamp) */
        time: number;
        /** Time string */
        timeString: string;
        /** News title */
        title: string;
    }
    class ProfitCalculation {
        profit: number;
    }
    class Order {
        order: number;
    }
    class TradeTransaction {
        /** Operation code */
        cmd: number;
        /** The value the customer may provide in order to retrieve it later. */
        customComment: string;
        /** Pending order expiration time */
        expiration: number;
        /** Trailing offset */
        offset: number;
        /** 0 or position number for closing/modifications */
        order: number;
        /** Trade price */
        price: number;
        /** Stop loss */
        sl: number;
        /** Trade symbol */
        symbol: string;
        /** Take profit */
        tp: number;
        /** Trade transaction type */
        type: number;
        /** Trade volume */
        volume: number;
    }
    class ServerTime {
        /** Timestamp */
        timstamp: number;
        /** Textual representation of the timestamp */
        timeString: string;
    }
    class StepRule {
        /** Step rule ID */
        id: number;
        /** Step rule name */
        name: string;
        steps: Step[];
    }
    class Step {
        /** Lower border of the volume range */
        fromValue: number;
        /** lotStep value in the given volume range */
        step: number;
    }
    class TradingHours {
        /** Quotes records */
        quotes: OperatingTime[];
        /** Symbol */
        symbol: string;
        /** of Trading records */
        trading: OperatingTime[];
    }
    class OperatingTime {
        /** Day of week (1 = Monday, 7 = Sunday) */
        day: number;
        /** Start time in ms from 00:00 CET / CEST (timestamp) */
        fromT: number;
        /** End time in ms from 00:00 CET / CEST (timestamp) */
        toT: number;
    }
    class TradeStatus {
        /** The value the customer may provide in order to retrieve it later. */
        customComment: string;
        /** Can be null */
        message: string;
        /** Unique order number */
        order: number;
        /** Price in base currency */
        price: number;
        /** Request status code, described below */
        requestStatus: number;
    }
    class ChartInfo {
        /** Number of decimal places */
        digits: number;
        rateInfos: RateInfoRecord[];
    }
    class RateInfoRecord {
        /** instrument symbol */
        symbol: string;
        /** Value of close price (shift from open price) */
        close: number;
        /** Candle start time in CET / CEST time zone (see Daylight Saving Time, DST) */
        ctm: number;
        /** String representation of the 'ctm' field */
        ctmString: string;
        /** Highest value in the given period (shift from open price) */
        high: number;
        /** Lowest value in the given period (shift from open price) */
        low: number;
        /** Open price (in base currency * 10 to the power of digits) */
        open: number;
        /** Volume in lots */
        vol: number;
    }
    class Candle extends XApiClient.RateInfoRecord {
        /** Source of price (only for streaming) */
        quoteId?: XApiClient.QuoteId;
    }
    class APIVersion {
        /** version string */
        version: string;
    }
}
