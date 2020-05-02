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

import EventTarget2 from '../../events/events';
import {Config} from './config';
import {Constants} from './x_api_constants';

/**
 * Javascript Implementation of the API to call remote operations on the XTB/X
 * Open Hub xStation 5 platform
 * @see http://developers.xstore.pro/documentation/2.5.0
 * @todo define a maximum amount of messages/s that can go in a single
 *     streaming socket and then have the sockets identify if a new one must be
 *     opened
 */
export class Client {
  isLoggedIn = false;
  #data: WeakMap<WebSocket, string>;
  #emitter: EventTarget2;
  readonly #password: string;
  readonly #endpoint: string;
  readonly #streamEndpoint: string;
  #sockets: Map<string, WebSocket>;
  #streamSessionId: string;
  readonly #username: string;
  static OPERATION_TYPES = [
    'BUY',
    'SELL',
    'BUY_LIMIT',
    'SELL_LIMIT',
    'BUY_STOP',
    'SELL_STOP',
    'BALANCE',
    'CREDIT',
  ];

  constructor(username: string, password: string, isDemo: boolean) {
    this.#username = username;
    this.#password = password;
    this.#emitter = new EventTarget2();
    this.#endpoint = isDemo ? Config.DEMO_ENDPOINT : Config.LIVE_ENDPOINT;
    this.#streamEndpoint = isDemo ? Config.DEMO_ENDPOINT_STREAM : Config.LIVE_ENDPOINT_STREAM;
    this.#sockets = new Map();
    this.#data = new WeakMap();
    this.#streamSessionId = '';
  }

  private static processChartRequest(chartInfo: ChartInfo, symbol: string): Candle[] {
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
   */
  getAllSymbols(): Promise<TickerSymbol[]> {
    return this.callOperation(Constants.ALL_SYMBOLS, 'getAllSymbols') as Promise<TickerSymbol[]>;
  }

  /**
   * Returns calendar with market events.
   */
  getCalendar(): Promise<Calendar[]> {
    return this.callOperation(Constants.CALENDAR, 'getCalendar') as Promise<Calendar[]>;
  }

  /**
   * Returns chart info, from start date to the current time.
   * Note: streamCandles is the preferred way of retrieving current candle data.
   * return {Promise<Candle[]>}
   */
  async getChartLastRequest(period: Period, start: Date, symbol: string): Promise<Candle[]> {
    const chartInfo = (await this.callOperation(Constants.CHART_LAST_REQUEST, 'getCalendar', {
      info: {period: period, start: start.getTime(), symbol: symbol},
    })) as ChartInfo;
    return Client.processChartRequest(chartInfo, symbol);
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
   * @see http://developers.xstore.pro/documentation/#getChartRangeRequest
   */
  async getChartRangeRequest(
    start: Date,
    end: Date,
    period: Period,
    symbol: string,
    ticks = 0
  ): Promise<Candle[]> {
    const chartInfo = (await this.callOperation(
      Constants.CHART_RANGE_REQUEST,
      'getChartRangeRequest',
      {
        info: {
          start: start.getTime(),
          end: end.getTime(),
          period: period,
          symbol: symbol,
          ticks: ticks,
        },
      }
    )) as ChartInfo;
    return Client.processChartRequest(chartInfo, symbol);
  }

  /**
   * Returns calculation of commission and rate of exchange.
   * The value is calculated as expected value, and therefore might not be
   * perfectly accurate.
   */
  getCommissionDef(tickerSymbol: string, volume: number): Promise<Commission> {
    return this.callOperation(Constants.COMMISSION_DEF, 'getCommissionDef', {
      symbol: tickerSymbol,
      volume: volume,
    }) as Promise<Commission>;
  }

  /**
   * Returns information about account currency, and account leverage
   * for the current API user
   */
  getCurrentUserData(): Promise<UserData> {
    return this.callOperation(Constants.CURRENT_USER_DATA, 'getCurrentUserData') as Promise<
      UserData
    >;
  }

  /**
   * Returns IBs data from the given time range.
   */
  getIbsHistory(start: Date, end: Date): Promise<IB[]> {
    return this.callOperation(Constants.IBS_HISTORY, 'getIbsHistory', {
      end: end.getTime(),
      start: start.getTime(),
    }) as Promise<IB[]>;
  }

  /**
   * Returns various account indicators
   * streamBalance is the preferred way of retrieving account indicators
   */
  async getMarginLevel(): Promise<Balance> {
    const result = (await this.callOperation(Constants.MARGIN_LEVEL, 'getMarginLevel')) as Record<
      string,
      string
    >;
    result.marginFree = result.margin_free;
    result.marginLevel = result.margin_level;
    return (result as unknown) as Promise<Balance>;
  }

  /**
   * Returns expected margin for given instrument and volume.
   * The value is calculated as expected margin value, and therefore might not
   * be perfectly accurate.
   */
  getMarginTrade(symbol: string, volume: number): Promise<Margin> {
    return this.callOperation(Constants.MARGIN_TRADE, 'getMarginTrade', {
      symbol: symbol,
      volume: volume,
    }) as Promise<Margin>;
  }

  /**
   * Returns news from trading server which were sent within specified Period
   * of time.
   * Note: streamNews is the preferred way of retrieving news data.
   */
  getNews(start: Date, end: Date): Promise<News[]> {
    return this.callOperation(Constants.NEWS, 'getNews', {
      start: start.getTime(),
      end: end.getTime(),
    }) as Promise<News[]>;
  }

  /**
   * Calculates estimated profit for given deal data Should be used for
   * calculator-like apps only. Profit for opened transactions should be
   * taken from server, due to higher precision of server calculation.
   */
  getProfitCalculation(
    cmd: Command,
    symbol: string,
    volume: number,
    openPrice: number,
    closePrice: number
  ): Promise<ProfitCalculation> {
    return this.callOperation(Constants.PROFIT_CALCULATION, 'getProfitCalculation', {
      cmd: cmd,
      symbol: symbol,
      volume: volume,
      openPrice: openPrice,
      closePrice: closePrice,
    }) as Promise<ProfitCalculation>;
  }

  /**
   * Returns current time on trading server.
   */
  getServerTime(): Promise<ServerTime> {
    return this.callOperation(Constants.SERVER_TIME, 'getServerTime') as Promise<ServerTime>;
  }

  /**
   * Returns a list of step rules for DMAs
   */
  getStepRules(): Promise<StepRule[]> {
    return this.callOperation(Constants.STEP_RULES, 'getStepRules') as Promise<StepRule[]>;
  }

  /**
   * Returns information about symbol available for the user.
   */
  getSymbol(symbol: string): Promise<TickerSymbol> {
    return this.callOperation(Constants.SYMBOL, 'getSymbol', {symbol: symbol}) as Promise<
      TickerSymbol
    >;
  }

  /**
   * Returns array of current quotations for given symbols, only quotations that
   * changed from given timestamp are returned. New timestamp obtained from
   * output will be used as an argument of the next call of this Command.
   * streamTickPrices is the preferred way of retrieving ticks data.
   *  Historical prices cannot be obtained using this method. It can only be used
   * to verify whether a price has changed since the given time.
   * @see http://developers.xstore.pro/documentation/#getTickPrices
   */
  getTickPrices(level: number, symbols: string, timestamp: number): Promise<TickPrice[]> {
    return this.callOperation(Constants.TICK_PRICES, 'getTickPrices', {
      level: level,
      symbols: symbols,
      timestamp: timestamp,
    }) as Promise<TickPrice[]>;
  }

  /**
   * Returns array of trades listed in orders argument.
   */
  getTradeRecords(orders: number[]): Promise<Trade[]> {
    return this.callOperation(Constants.TRADE_RECORDS, 'getTradeRecords', {
      orders: orders,
    }) as Promise<Trade[]>;
  }

  /**
   * Returns array of user's trades
   * Note: streamTrades is the preferred way of retrieving trades data.
   */
  getTrades(openedOnly: boolean): Promise<Trade[]> {
    return this.callOperation(Constants.TRADES, 'getTrades', {
      openedOnly: openedOnly,
    }) as Promise<Trade[]>;
  }

  /**
   * Returns array of user's trades which were closed within specified Period
   * of time.
   * Note: streamTrades is the preferred way of retrieving trades data.
   */
  getTradesHistory(start: Date, end: Date): Promise<Trade[]> {
    return this.callOperation(Constants.TRADES_HISTORY, 'getTradesHistory', {
      start: start.getTime(),
      end: end.getTime(),
    }) as Promise<Trade[]>;
  }

  /**
   * Returns quotes and trading times.
   */
  getTradingHours(symbols: string[]): Promise<TradingHours[]> {
    return this.callOperation(Constants.TRADING_HOURS, 'getTradingHours', {
      symbols: symbols,
    }) as Promise<TradingHours[]>;
  }

  /**
   * Returns the current API version.
   */
  getVersion(): Promise<APIVersion> {
    return this.callOperation(Constants.VERSION, 'getVersion') as Promise<APIVersion>;
  }

  /**
   * In order to perform any action client applications have to perform login
   * process. No functionality is available before a successful login. After
   * initial login, a new session is created and all commands can executed by
   * an authenticated user until he/she logs out or drops the connection.
   */
  async login(): Promise<boolean> {
    const errorEventType = Constants.ERROR_PREFIX + Constants.LOGIN;
    const socket = this.connectSocket('operation', this.#endpoint);
    const payload = {
      command: 'login',
      arguments: {
        userId: this.#username,
        password: this.#password,
      },
      customTag: Constants.LOGIN,
    };

    socket.send(JSON.stringify(payload));
    const errorPromise = () => this.#emitter.once(errorEventType);
    const successPromise = () => this.#emitter.once(Constants.LOGIN);

    const event = (await Promise.race([errorPromise(), successPromise()])) as CustomEvent;
    if (event.type === errorEventType) {
      throw new Error(`Could not log in: ${event.detail.errorDescr} (${event.detail.errorCode})`);
    }

    this.#streamSessionId = event.detail;
    this.isLoggedIn = true;
    return true;
  }

  /**
   * logs out and closes all the sockets
   */
  logout(): void {
    this.callOperation(Constants.LOGOUT, 'logout');
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
   * that does not execute other commands, should call this Command at least
   * once every 10 minutes.
   */
  ping(): void {
    this.callOperation(Constants.PING, 'ping');
  }

  /**
   * stops streaming Balance
   */
  stopStreamBalance(): void {
    this.stopStreaming(Constants.STREAM_BALANCE, 'stopBalance');
  }

  /**
   * stops streaming candles for the specified symbol
   */
  stopStreamCandles(symbol: string): void {
    this.stopStreaming(`${Constants.STREAM_CANDLES}_${symbol}`, 'stopCandles');
  }

  /**
   * stops streaming Keep-Alive
   */
  stopStreamKeepAlive(): void {
    this.stopStreaming(Constants.STREAM_KEEP_ALIVE, 'stopKeepAlive');
  }

  /**
   * stops streaming News
   */
  stopStreamNews(): void {
    this.stopStreaming(Constants.STREAM_NEWS, 'stopNews');
  }

  /**
   * stops streaming Profits
   */
  stopStreamProfits(): void {
    this.stopStreaming(Constants.STREAM_PROFITS, 'stopProfits');
  }

  /**
   * stops streaming trades status for the specified symbol
   */
  stopStreamTickPrices(symbol: string): void {
    this.stopStreaming(`${Constants.STREAM_TICK_PRICES}_${symbol}`, 'stopTickPrices');
  }

  /**
   * stops streaming trades status
   */
  stopStreamTradeStatus(): void {
    this.stopStreaming(Constants.STREAM_TRADE_STATUS, 'stopTradeStatus');
  }

  /**
   * stops streaming trades
   */
  stopStreamTrades(): void {
    this.stopStreaming(Constants.STREAM_TRADES, 'stopTrades');
  }

  /**
   * Allows to get actual account indicators values in real-time, as soon as
   * they are available in the system.
   */
  async *streamBalance(): AsyncGenerator<Balance> {
    yield* this.streamOperation('getBalance', Constants.STREAM_BALANCE) as AsyncGenerator<Balance>;
  }

  /**
   * Subscribes to API chart candles. The interval of every candle is 1 minute.
   * A new candle arrives every minute.
   */
  async *streamCandles(symbol: string): AsyncGenerator<Candle> {
    yield* this.streamOperation('getCandles', Constants.STREAM_CANDLES, {
      symbol: symbol,
    }) as AsyncGenerator<Candle>;
  }

  /**
   * Subscribes to 'keep alive' messages.
   * A new 'keep alive' message is sent by the API every 3 seconds
   */
  async *streamKeepAlive(): AsyncGenerator<KeepAlive> {
    yield* this.streamOperation('keepAlive', Constants.STREAM_KEEP_ALIVE) as AsyncGenerator<
      KeepAlive
    >;
  }

  /**
   * Subscribes to news.
   */
  async *streamNews(): AsyncGenerator<News> {
    yield* this.streamOperation(Constants.STREAM_NEWS, 'getNews') as AsyncGenerator<News>;
  }

  /**
   * Regularly calling this function is enough to refresh the internal state of
   * all the components in the system. Streaming connection, when any Command
   * is not sent by client in the session, generates only one way network
   * traffic. It is recommended that any application that does not execute
   * other commands, should call this Command at least once every 10 minutes.
   */
  async *streamPing(): AsyncGenerator<KeepAlive> {
    yield* this.streamOperation(Constants.STREAM_PING, 'ping') as AsyncGenerator<KeepAlive>;
  }

  /**
   * Subscribes to profits
   */
  async *streamProfits(): AsyncGenerator<Profit> {
    yield* this.streamOperation(Constants.STREAM_PROFITS, 'getProfits') as AsyncGenerator<Profit>;
  }

  /**
   * Establishes subscription for quotations and allows to obtain the relevant
   * information in real-time, as soon as it is available in the system. The
   * getTickPrices Command can be invoked many times for the same symbol, but
   * only one subscription for a given symbol will be created. Please beware
   * that when multiple records are available, the order in which they are
   * received is not guaranteed. minArrivalTime
   */
  async *streamTickPrices(
    symbol: string,
    {minArrivalTime = 0, maxLevel}: {minArrivalTime: number; maxLevel: number}
  ): AsyncGenerator<TickPrice> {
    const params = {
      minArrivalTime: minArrivalTime,
      symbol: symbol,
      maxLevel: maxLevel,
    };
    yield* this.streamOperation(
      Constants.STREAM_TICK_PRICES,
      'streamTickPrices',
      params
    ) as AsyncGenerator<TickPrice>;
  }

  /**
   * Allows to get status for sent trade requests in real-time, as soon as it
   * is
   * available in the system. Please beware that when multiple records are
   * available, the order in which they are received is not guaranteed.
   */
  async *streamTradeStatus(): AsyncGenerator<TradeStatus> {
    yield* this.streamOperation(Constants.STREAM_TRADE_STATUS, 'getTradeStatus') as AsyncGenerator<
      TradeStatus
    >;
  }

  /**
   * Establishes subscription for user trade status data and allows to obtain
   * the relevant information in real-time, as soon as it is available in the
   * system. Please beware that when multiple records are available, the order
   * in which they are received is not guaranteed.
   * @see http://developers.xstore.pro/documentation/2.5.0#streamTrades
   */
  async *streamTrades(): AsyncGenerator<Trade> {
    yield* this.streamOperation(Constants.STREAM_TRADES, 'getTrades') as AsyncGenerator<Trade>;
  }

  /**
   * Starts trade transaction. tradeTransaction sends main transaction
   * information to the server.
   * to retrieve it later.
   */
  tradeTransaction(
    cmd: Command,
    customComment: string,
    expiration: number,
    offset: number,
    order: number,
    price: number,
    sl: number,
    symbol: string,
    tp: number,
    type: TradeType,
    volume: number
  ): Promise<Order> {
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
    }) as Promise<Order>;
  }

  /**
   * Returns current transaction status. At any time of transaction processing
   * client might check the status of transaction on server side. In order to
   * do that client must provide unique order taken from tradeTransaction.
   * Note: XApiClient#StreamTradeStatus is the preferred way of retrieving
   * transaction status data.
   */
  async tradeTransactionStatus(order: number): Promise<TradeStatus> {
    const response = (await this.callOperation(
      Constants.TRADE_TRANSACTION_STATUS,
      'tradeTransactionStatus',
      {order: order}
    )) as Record<string, string>;
    if (response.ask !== response.bid) {
      throw new Error(
        `Error retrieving transaction price: Ask was ${response.ask},` + `Bid was ${response.bid}`
      );
    }
    response.price = response.ask;
    return (response as unknown) as Promise<TradeStatus>;
  }

  /**
   * Generic method that sends a message to the server and (asynchronously)
   * waits for a reply
   */
  private async callOperation(
    customTag: string,
    operationName: string,
    args: Record<string, unknown> = {}
  ): Promise<unknown> {
    this.checkLoggedIn();
    let payload = {command: operationName, customTag: customTag};
    if (Object.keys(args).length !== 0 || args.constructor !== Object) {
      payload = {...payload, ...{arguments: args}};
    }
    const socket = this.#sockets.get('operation');
    if (typeof socket === 'undefined') {
      throw Error('Could not find socket');
    }
    socket.send(JSON.stringify(payload));

    return ((await this.#emitter.once(operationName)) as CustomEvent).detail;
  }

  /**
   * checks if a user is logged in, throws error if not
   */
  private checkLoggedIn() {
    if (!this.isLoggedIn) {
      throw new Error('Not logged in');
    }
  }

  /**
   * opens a socket and connects to the XTB/ XOpen Hub Server
   * Basically each streaming message has its own dedicated
   *     socket
   */
  private connectSocket(name: string, endpoint: string = this.#endpoint): WebSocket {
    if (this.#sockets.has(name)) {
      console.log(`socket ${name} already exists. Doing nothing`);
      return this.#sockets.get(name)!;
    }
    const socket = new WebSocket(endpoint);
    socket.onclose = closeEvent => {
      console.log(`Socket ${name} disconnected`);
      if (closeEvent.code !== 1000) {
        throw new Error(
          'The server unexpectedly closed the connection.' +
            `Error code ${closeEvent.code}. More info can be found in` +
            'https://www.iana.org/assignments/websocket/websocket.xml#close-code-number'
        );
      }
      this.#sockets.delete(name);
      this.#data.delete(socket);
    };

    socket.onmessage = messageEvent => {
      this.parseResponse(messageEvent.data, socket);
    };

    this.#sockets.set(name, socket);
    this.#data.set(socket, '');
    return socket;
  }

  /**
   * parses the response and publishes an event so the corresponding
   * handler can take care of it
   */
  private parseResponse(rcvd: string, socket: WebSocket): void {
    const responses = (this.#data.get(socket) + rcvd).trim().split('\n\n');
    // API messages are always terminated with two newlines
    const remainder = rcvd.lastIndexOf('\n\n') === rcvd.length - 2 ? '' : responses.pop();
    if (typeof remainder === 'undefined') {
      throw new Error('');
    }
    this.#data.set(socket, remainder);
    for (const response of responses) {
      const responseObj = JSON.parse(response);
      if (responseObj.status) {
        const returnData =
          responseObj.customTag === Constants.LOGIN
            ? responseObj.streamSessionId
            : responseObj.returnData;
        this.#emitter.dispatchEvent(new CustomEvent(responseObj.customTag, {detail: returnData}));
        continue;
      }
      const event = new CustomEvent<Record<string, object>>(
        Constants.ERROR_PREFIX + responseObj.customTag,
        {
          detail: responseObj,
        }
      );
      this.#emitter.dispatchEvent(event);

      console.warn(
        `Call with customTag ${responseObj.customTag}` +
          `Failed: ${responseObj.errorDescr} (code: ${responseObj.errorCode})`
      );
    }
  }

  /**
   * generic method to stop streaming a Command
   */
  private stopStreaming(customTag: string, stopCommand: string, args: object = {}): boolean {
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
   * when the subscription is cancelled (see stopStreaming) it closes the
   * socket
   */
  private async *streamOperation(
    customTag: string,
    command: string,
    args: object = {}
  ): AsyncGenerator<unknown> {
    this.checkLoggedIn();

    if (this.#sockets.has(customTag)) {
      return;
    }
    const socket = this.connectSocket(customTag, this.#streamEndpoint);
    this.#sockets.set(customTag, socket);
    const payload = {command: command, customTag: customTag};
    if (Object.keys(args).length !== 0 || args.constructor !== Object) {
      Object.assign(payload, args);
    }
    socket.send(JSON.stringify(payload));
    for await (const triggeredEvent of this.#emitter.on(customTag)) {
      yield (triggeredEvent as CustomEvent).detail;
    }
  }
}

export enum Period {
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
  PERIOD_MN1 = 43200,
}

export enum Command {
  BUY = 0,
  SELL = 1,
  BUY_LIMIT = 2,
  SELL_LIMIT = 3,
  BUY_STOP = 4,
  SELL_STOP = 5,
  BALANCE = 6,
  CREDIT = 7,
}

export enum QuoteId {
  FIXED = 1,
  FLOAT = 2,
  DEPTH = 3,
  CROSS = 4,
}

export enum StreamTradeStatus {
  ERROR = 0,
  PENDING = 1,
  ACCEPTED = 3,
  REJECTED = 4,
}

export enum StreamTradesState {
  MODIFIED = 'modified',
  DELETED = 'deleted',
}

export enum TradeType {
  OPEN = 0,
  PENDING = 1,
  CLOSE = 2,
  MODIFY = 3,
  DELETE = 4,
}

export interface Balance {
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

export interface News {
  /** Body */
  body: string;
  /** News key */
  key: string;
  /** Time (timestamp) */
  time: number;
  /** News title */
  title: string;
}

export interface TickPrice {
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
  quoteId?: QuoteId;
  /** The difference between raw ask and bid prices */
  spreadRaw: number;
  /** Spread representation */
  spreadTable: number;
  /** Symbol */
  symbol: string;
  /** Timestamp */
  timestamp: number;
}

export interface Trade {
  /** Close price in base currency */
  close_price: number;
  /** Null if order is not closed */
  close_time?: number;
  /** Closed */
  closed: boolean;
  /** Operation code */
  cmd: Command;
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

export interface Profit {
  /** Order number */
  order: number;
  /** Transaction ID */
  order2: number;
  /** Position number */
  position: number;
  /** Profit in account currency */
  profit: number;
}

export interface KeepAlive {
  /** Current Timestamp */
  timestamp: number;
}

export interface TickerSymbol {
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
  /** Instrument export interface number */
  type: number;
}

export interface Calendar {
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

export interface ChartInfoRecord {
  digits: number;
  rateInfos: RateInfoRecord[];
}

export interface Commission {
  /** calculated commission in account currency, could be null if not applicable */
  commission: number;
  /** rate of exchange between account currency and instrument base currency, could be null if not applicable */
  rateOfExchange?: number;
}

export interface UserData {
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

// eslint-disable-next-line @typescript-eslint/interface-name-prefix
export interface IB {
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

export interface Margin {
  margin: number;
}

export interface NewsTopicRecord {
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

export interface ProfitCalculation {
  profit: number;
}

export interface Order {
  order: number;
}

export interface TradeTransaction {
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

export interface ServerTime {
  /** Timestamp */
  timstamp: number;
  /** Textual representation of the timestamp */
  timeString: string;
}

export interface StepRule {
  /** Step rule ID */
  id: number;
  /** Step rule name */
  name: string;
  steps: Step[];
}

export interface Step {
  /** Lower border of the volume range */
  fromValue: number;
  /** lotStep value in the given volume range */
  step: number;
}

export interface TradingHours {
  /** Quotes records */
  quotes: OperatingTime[];
  /** Symbol */
  symbol: string;
  /** of Trading records */
  trading: OperatingTime[];
}

export interface OperatingTime {
  /** Day of week (1 = Monday, 7 = Sunday) */
  day: number;
  /** Start time in ms from 00:00 CET / CEST (timestamp) */
  fromT: number;
  /** End time in ms from 00:00 CET / CEST (timestamp) */
  toT: number;
}

export interface TradeStatus {
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

export interface ChartInfo {
  /** Number of decimal places */
  digits: number;
  rateInfos: RateInfoRecord[];
}

export interface RateInfoRecord {
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

export interface Candle extends RateInfoRecord {
  /** Source of price (only for streaming) */
  quoteId?: QuoteId;
}

export interface APIVersion {
  /** version string */
  version: string;
}
