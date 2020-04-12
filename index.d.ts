export default XApi;
export type XApi = {
    Client: XApiClient;
    Constants: Readonly<{
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
};
declare namespace XApi {
    export { XApiClient as Client };
    export { xapi_constants as Constants };
}
import XApiClient from "./src/brokers/xtb/x_api_client";
import xapi_constants from "./src/brokers/xtb/xapi_constants";
