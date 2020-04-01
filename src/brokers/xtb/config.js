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
module.exports = Object.freeze({
  ENDPOINT: 'xapi.xtb.com',
  LIVE_PORT: 5112,
  LIVE_STREAM_PORT: 5113,
  DEMO_PORT: 5124,
  DEMO_STREAM_PORT: 5125, // According to the docs, max is 50, but one socket is used for
  // non-streaming commands
  MAX_STREAM_SOCKETS: 49,
  INITIAL_POOL_SIZE: 5,
  POOL_STEP_INCREASE: 5, //number of incoming messages / second after which another <POOL_STEP_INCREASE> sockets will be opened
  MAX_MESSAGES: 100, //number of incoming messages / second after which sockets with not enough traffic will be closed and merged
  MIN_MESSAGES: 20, //interval (in seconds) in which the socket merge will take place
  SOCKET_MERGE_INTERVAL: 10,
});

