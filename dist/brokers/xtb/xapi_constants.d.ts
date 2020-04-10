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

export = XAPIConstants;
declare const XAPIConstants: Readonly<{
    ERROR_PREFIX: string;
    LOGIN: string;
    LOGOUT: string;
    STREAM_BALANCE: string;
    STREAM_CANDLES: string;
    STREAM_KEEP_ALIVE: string;
    STREAM_NEWS: string;
    STREAM_PROFITS: string;
    STREAM_TICK_PRICES: string;
    STREAM_TRADES: string;
    STREAM_TRADE_STATUS: string;
    STREAM_PING: string;
    ALL_SYMBOLS: string;
    CALENDAR: string;
    CHART_LAST_REQUEST: string;
    CHART_RANGE_REQUEST: string;
    COMMISSION_DEF: string;
    CURRENT_USER_DATA: string;
    IBS_HISTORY: string;
    MARGIN_LEVEL: string;
    MARGIN_TRADE: string;
    NEWS: string;
    PROFIT_CALCULATION: string;
    SERVER_TIME: string;
    STEP_RULES: string;
    SYMBOL: string;
    TICK_PRICES: string;
    TRADE_RECORDS: string;
    TRADES: string;
    TRADES_HISTORY: string;
    TRADING_HOURS: string;
    VERSION: string;
    PING: string;
    TRADE_TRANSACTION: string;
    TRADE_TRANSACTION_STATUS: string;
}>;
