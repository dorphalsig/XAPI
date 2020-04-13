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
export var Config;
(function (Config) {
    Config["LIVE_ENDPOINT"] = "wss://ws.xtb.com/real";
    Config["LIVE_ENDPOINT_STREAM"] = "wss://ws.xtb.com/realStream";
    Config["DEMO_ENDPOINT"] = "wss://ws.xtb.com/demo";
    Config["DEMO_ENDPOINT_STREAM"] = "wss://ws.xtb.com/realStream";
    // non-streaming commands
    Config[Config["MAX_STREAM_SOCKETS"] = 49] = "MAX_STREAM_SOCKETS";
    Config[Config["INITIAL_POOL_SIZE"] = 5] = "INITIAL_POOL_SIZE";
    /* number of incoming messages / second after which another <POOL_STEP_INCREASE>
     sockets will be opened */
    Config[Config["POOL_STEP_INCREASE"] = 5] = "POOL_STEP_INCREASE";
    /* number of incoming messages / second after which sockets with not enough
    traffic will be closed and merged MIN_MESSAGES: 20, // interval (in seconds)
    in which the socket merge will  take place */
    Config[Config["MAX_MESSAGES"] = 100] = "MAX_MESSAGES";
    Config[Config["SOCKET_MERGE_INTERVAL"] = 10] = "SOCKET_MERGE_INTERVAL";
})(Config || (Config = {}));
//# sourceMappingURL=config.js.map