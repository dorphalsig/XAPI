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
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var _eventsListened;
export default class EventTarget2 extends EventTarget {
    constructor() {
        super();
        _eventsListened.set(this, void 0);
        __classPrivateFieldSet(this, _eventsListened, new Set());
    }
    /**
     * Stops iterating
     * @param {string} eventName
     */
    off(eventName) {
        __classPrivateFieldGet(this, _eventsListened).delete(eventName);
    }
    /**
     * Returns an iterator that loops over caught events
     * @yields Promise<Event|CustomEvent>
     */
    async *on(eventName, options) {
        if (__classPrivateFieldGet(this, _eventsListened).has(eventName)) {
            return;
        }
        let results = [];
        let resolve;
        let promise = new Promise(r => (resolve = r));
        let done = false;
        __classPrivateFieldGet(this, _eventsListened).add(eventName);
        if (typeof options === 'object' && typeof options.once !== 'undefined') {
            throw new Error('options.once is not supported. Use EventTarget2.once instead');
        }
        const callback = (evt) => {
            results.push(evt);
            resolve();
            promise = new Promise(r => (resolve = r));
        };
        this.addEventListener('eventName', callback, options);
        while (!done) {
            await promise;
            // @ts-ignore
            yield* results;
            results = [];
            done = !__classPrivateFieldGet(this, _eventsListened).has(eventName);
        }
        this.removeEventListener(eventName, callback);
    }
    once(eventName) {
        return new Promise(resolve => {
            this.addEventListener(eventName, evt => resolve(evt));
        });
    }
}
_eventsListened = new WeakMap();
//# sourceMappingURL=events.js.map