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

export default class EventTarget2 extends EventTarget {
  /**
   * @type {Set<string>}
   */
  #eventsListened;

  constructor() {
    super();
  }

  /**
   * Stops iterating
   * @param {string} eventName
   */
  off(eventName) {
    this.#eventsListened.delete(eventName);
  }

  /**
   * Returns an iterator that loops over caught events
   * @param {string} eventName
   * @param {object} options
   * @yields Promise<Event|CustomEvent>
   */
  async* on(eventName, options) {
    if (this.#eventsListened.has(eventName)) {
      return;
    }
    /**
     * @type {*[]}
     */
    let results = [];
    /**
     * @type *
     */
    let resolve;
    let promise = new Promise(r => resolve = r);
    let done = false;
    this.#eventsListened.add(eventName);

    if (typeof options === 'object' && Object.hasOwnProperty('once')) {
      throw new Error('options.once is not supported. Use EventTarget2.once' +
          ' instead');
    }

    /**
     *
     * @param {Event|CustomEvent} event
     */
    const callback = event => {
      results.push(event);
      resolve();
      promise = new Promise(r => resolve = r);
    };

    /**
     * @type {CustomEvent}
     */
    this.addEventListener('eventName', callback, options);
    while (!done) {
      await promise;
      yield* results;
      results = [];
      done = !this.#eventsListened.has(eventName);
    }
    this.removeEventListener(eventName, callback);
  }

  /**
   * Wraps the event listener in a promise that will get resolved when it fires
   * @param {string} eventName
   * @return {Promise<Event|CustomEvent>}
   */
  once(eventName) {
    return new Promise(resolve => {
      this.addEventListener(eventName, evt => resolve(evt));
    });

  }
}
