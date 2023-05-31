import { sendMessage } from '../../../src/utils'

export class SendMessageMessagingConfig {}

/**
 * An temporary implementation of {@link MessagingTransport} to communicate with Android and Extension.
 * It wraps the current messaging system that calls `sendMessage`
 *
 * @implements {MessagingTransport}
 */
export class SendMessageMessagingTransport {
    /**
     * Queue of callbacks to be called with messages sent from the Platform.
     * This is used to connect requests with responses and to trigger subscriptions callbacks.
     */
    _queue = new Set()

    /**
     * @param {SendMessageMessagingConfig} config
     * @param {import("@duckduckgo/messaging").MessagingContext} messagingContext
     * @internal
     */
    constructor (config, messagingContext) {
        this.messagingContext = messagingContext
        this.globals = {
            window,
            JSONparse: window.JSON.parse,
            JSONstringify: window.JSON.stringify,
            Promise: window.Promise,
            Error: window.Error,
            String: window.String
        }
    }

    /**
     * Callback for update() handler. This connects messages sent from the Platform
     * with callback functions in the _queue.
     * @param {any} response
     */
    onResponse (response) {
        this._queue.forEach((subscription) => subscription(response))
    }

    /**
     * @param {import("@duckduckgo/messaging").NotificationMessage} msg
     */
    notify (msg) {
        sendMessage(msg.method, msg.params)
    }

    /**
     * @param {import("@duckduckgo/messaging").RequestMessage} msg
     * @return {Promise<any>}
     */
    request (req) {
        switch (req.method) {
        case 'getYouTubeVideoDetails': {
            const comparator = (eventData) => {
                return (
                    eventData.responseMessageType === req.method &&
                        eventData.response &&
                        eventData.response.videoURL === req.params
                )
            }
            return new this.globals.Promise((resolve) => {
                sendMessage('getYouTubeVideoDetails', req.params)
                this._subscribe(comparator, (msgRes, unsubscribe) => {
                    unsubscribe()

                    resolve(msgRes.response)
                })
            })
        }
        // Expected default messages:
        default: {
            const comparator = (eventData) => {
                return eventData.responseMessageType === req.method
            }
            sendMessage(req.method, req.params)
            return new this.globals.Promise((resolve) => {
                this._subscribe(comparator, (msgRes, unsubscribe) => {
                    unsubscribe()

                    resolve(msgRes.response)
                })
            })
        }
        }
    }

    /**
     * @param {import("@duckduckgo/messaging").Subscription} msg
     * @param {(value: unknown | undefined) => void} callback
     */
    subscribe (msg, callback) {
        const comparator = (eventData) => {
            return (
                eventData.messageType === msg.subscriptionName ||
                eventData.responseMessageType === msg.subscriptionName
            )
        }

        // only forward the 'params' ('response' in current format), to match expected
        // callback from a SubscriptionEvent
        const cb = (eventData) => {
            return callback(eventData.response)
        }
        return this._subscribe(comparator, cb)
    }

    /**
     * @param {(eventData: any) => boolean} comparator
     * @param {(value: any, unsubscribe: (()=>void)) => void} callback
     * @internal
     */
    _subscribe (comparator, callback) {
        /** @type {(()=>void) | undefined} */
        // eslint-disable-next-line prefer-const
        let teardown

        /**
         * @param {MessageEvent} event
         */
        const idHandler = (event) => {
            if (!event) {
                console.warn('no message available')
                return
            }
            if (comparator(event)) {
                if (!teardown) throw new this.globals.Error('unreachable')
                callback(event, teardown)
            }
        }
        this._queue.add(idHandler)

        teardown = () => {
            this._queue.delete(idHandler)
        }

        return () => {
            teardown?.()
        }
    }
}
