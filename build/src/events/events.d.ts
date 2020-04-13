export default class EventTarget2 extends EventTarget {
    #private;
    constructor();
    /**
     * Stops iterating
     * @param {string} eventName
     */
    off(eventName: string): void;
    /**
     * Returns an iterator that loops over caught events
     * @yields Promise<Event|CustomEvent>
     */
    on(eventName: string, options?: AddEventListenerOptions): AsyncGenerator<Event>;
    once(eventName: string): Promise<Event>;
}
