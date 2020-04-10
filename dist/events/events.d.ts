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

export default EventTarget2;

declare class EventTarget2 extends EventTarget {
    #private;

    /**
     * Stops iterating
     * @param eventName
     */
    off(eventName: any): void;

    /**
     * Returns an iterator that loops over caught events
     * @param {string} eventName
     * @param options
     * @return {AsyncGenerator<Event>|void}
     */
    on(eventName: string, options: any): void | AsyncGenerator<Event, any, any>;

    /**
     * Wraps the event listener in a promise that will get resolved when it fires
     * @param eventName
     * @return {Promise<Event>}
     */
    once(eventName: any): Promise<Event>;
}
