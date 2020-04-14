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

export default class EventTarget2 extends EventTarget {
  #eventsListened: Set<string>;

  constructor() {
    super();
    this.#eventsListened = new Set<string>();
  }

  /**
   * Stops iterating
   * @param {string} eventName
   */
  off(eventName: string) {
    this.#eventsListened.delete(eventName);
  }

  /**
   * Returns an iterator that loops over caught events
   * @yields Promise<Event|CustomEvent>
   */
  async *on(
    eventName: string,
    options?: AddEventListenerOptions
  ): AsyncGenerator<Event, void, undefined> {
    if (this.#eventsListened.has(eventName)) {
      return;
    }
    let results: Event[] = [];

    let resolve: (value?: PromiseLike<Event> | Event) => void;

    let promise = new Promise<Event>(r => (resolve = r));
    let done = false;
    this.#eventsListened.add(eventName);

    if (typeof options === 'object' && typeof options.once !== 'undefined') {
      throw new Error('options.once is not supported. Use EventTarget2.once instead');
    }
    const callback = (evt: Event) => {
      results.push(evt);
      resolve();
      promise = new Promise<Event>(r => (resolve = r));
    };

    this.addEventListener('eventName', callback, options);
    while (!done) {
      await promise;
      yield* results;
      results = [];
      done = !this.#eventsListened.has(eventName);
    }
    this.removeEventListener(eventName, callback);
  }

  once(eventName: string): Promise<Event> {
    return new Promise(resolve => {
      this.addEventListener(eventName, evt => resolve(evt));
    });
  }
}
