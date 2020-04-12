export default class EventTarget2 extends EventTarget {
    #private;

    /**
     * Stops iterating
     * @param {string} eventName
     */
    off(eventName: string): void;

    /**
     * Returns an iterator that loops over caught events
     * @param {string} eventName
     * @param {object} options
     * @yields Promise<Event|CustomEvent>
     */
    on(eventName: string, options: object): AsyncGenerator<Event | CustomEvent<any>, void, undefined>;

    /**
     * Wraps the event listener in a promise that will get resolved when it fires
     * @param {string} eventName
     * @return {Promise<Event|CustomEvent>}
     */
    once(eventName: string): Promise<Event | CustomEvent<any>>;
}
