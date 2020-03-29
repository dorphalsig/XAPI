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

const XAPIConstants = Object.freeze({
  URL: 'xapi.xtb.com',
  ERROR: 'ERROR',
  LIVE_TCP_PORT: 5112,
  LIVE_STREAM_PORT: 5113,
  DEMO_TCP_PORT: 5124,
  DEMO_STREAM_PORT: 5125,
  LOGIN: 'login',
  STREAM_BALANCE: 'streamBalance',
  STREAM_CANDLES: 'streamCandles',
  STREAM_KEEP_ALIVE: 'streamKeepAlive',
  STREAM_NEWS: 'streamNews',
  STREAM_PROFITS: 'streamProfits',
  STREAM_TICK_PRICES: 'streamTickPrices',
  STREAM_TRADES: 'streamTrades',
  STREAM_TRADE_STATUS: 'streamTradeStatus',
  STREAM_PING: 'streamPing',
  ALL_SYMBOLS: 'allSymbols',
  CALENDAR: 'calendar',
  CHART_LAST_REQUEST: 'chartLastRequest',
  CHART_RANGE_REQUEST: 'chartRangeRequest',
  COMMISSION_DEF: 'commissionDef',
  CURRENT_USER_DATA: 'currentUserData',
  IBS_HISTORY: 'ibsHistory',
  MARGIN_LEVEL: 'marginLevel',
  MARGIN_TRADE: 'marginTrade',
  NEWS: 'news',
  PROFIT_CALCULATION: 'profitCalculation',
  SERVER_TIME: 'serverTime',
  STEP_RULES: 'stepRules',
  SYMBOL: 'symbol',
  TICK_PRICES: 'tickPrices',
  TRADE_RECORDS: 'tradeRecords',
  TRADES: 'trades',
  TRADES_HISTORY: 'tradesHistory',
  TRADING_HOURS: 'tradingHours',
  VERSION: 'version',
  PING: 'ping',
  TRADE_TRANSACTION: 'tradeTransaction',
  TRADE_TRANSACTION_STATUS: 'tradeTransactionStatus',
  /**
   * @readonly
   * @enum {number}
   */
  COMMAND: Object.freeze({
    BUY: 0,
    SELL: 1,
    BUY_LIMIT: 2,
    SELL_LIMIT: 3,
    BUY_STOP: 4,
    SELL_STOP: 5,
    BALANCE: 6,
    CREDIT: 7,
  }),
  /**
   * @readonly
   * @enum {string}
   */
  STREAM_TRADES_STATE: Object.freeze({
    MODIFIED: 'modified', DELETED: 'deleted',
  }),
  /**
   * @readonly
   * @enum {number}
   */
  TRADE_TYPES: Object.freeze({
    OPEN: 0, PENDING: 1, CLOSE: 2, MODIFY: 3, DELETE: 4,
  }),
  /**
   * @readonly
   * @enum {number}
   */
  STREAM_TRADE_STATUS_REQUEST_STATUS: Object.freeze({
    ERROR: 0, PENDING: 1, ACCEPTED: 3, REJECTED: 4,
  }),
  /**
   * @readonly
   * @enum {number}
   */
  PERIOD: {
    PERIOD_M1: 1,
    PERIOD_M5: 5,
    PERIOD_M15: 15,
    PERIOD_M30: 30,
    PERIOD_H1: 60,
    PERIOD_H4: 240,
    PERIOD_D1: 1440,
    PERIOD_W1: 10080,
    PERIOD_MN1: 43200,
  },
});
module.exports = XAPIConstants;
