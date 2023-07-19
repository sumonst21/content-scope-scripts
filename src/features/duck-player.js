/**
 * @module Duck Player Overlays
 *
 * @description
 *
 * Duck Player Overlays are either the small Dax icons that appear on top of video thumbnails
 * when browsing YouTube. These icons allow users to open the video in Duck Player.
 *
 * On the YouTube player page, the main Duck Player Overlay also allows users to open the video
 * in Duck Player, or dismiss the overlay.
 *
 * #### Messages:
 *
 * On Page Load
 *   - {@link DuckPlayerOverlayMessages.getUserValues} is initially called to get the current settings
 *   - {@link DuckPlayerOverlayMessages.onUserValuesChanged} subscription begins immediately - it will continue to listen for updates
 *
 * Then the following message can be sent at any time
 *   - {@link DuckPlayerOverlayMessages.setUserValues}
 *   - {@link DuckPlayerOverlayMessages.openDuckPlayer}
 *
 * Please see {@link DuckPlayerOverlayMessages} for the up-to-date list
 *
 * ## Remote Config
 *
 *   - Please see {@link OverlaysFeatureSettings} for docs on the individual fields
 *
 * All features are **off** by default. Remote config is then used to selectively enable features.
 *
 * For example, to enable the Duck Player Overlay on YouTube, the following config is used:
 *
 * ```json
 * [[include:integration-test/test-pages/duckplayer/config/overlays-live.json]]```
 *
 */
import ContentFeature from '../content-feature.js'

import { DuckPlayerOverlayMessages, OpenInDuckPlayerMsg, Pixel } from './duckplayer/overlay-messages.js'
import dlv, { isBeingFramed } from '../utils.js'
import { createMessaging } from '../create-messaging.js'
import { Environment, initOverlays } from './duckplayer/overlays.js'

/**
 * @typedef UserValues - A way to communicate user settings
 * @property {{enabled: {}} | {alwaysAsk:{}} | {disabled:{}}} privatePlayerMode - one of 3 values
 * @property {boolean} overlayInteracted - always a boolean
 */

/**
 * @internal
 */
export default class DuckPlayerFeature extends ContentFeature {
    /**
     * Lazily create a messaging instance for the given Platform + feature combo
     *
     * Note: This will be moved to 'ContentFeature' once we've ironed out all implementations
     * @return {import('@duckduckgo/messaging').Messaging}
     */
    get messaging () {
        if (this._messaging) return this._messaging
        if (typeof import.meta.injectName === 'undefined') throw new Error('import.meta.injectName missing')
        this._messaging = createMessaging(this, import.meta.injectName)
        return this._messaging
    }

    init (args) {
        /**
         * This feature never operates in a frame
         */
        if (isBeingFramed()) return

        /**
         * Overlays
         */
        const overlaySettings = this.getFeatureSetting('overlays')
        const overlaysEnabled = overlaySettings?.youtube?.state === 'enabled'

        /**
         * Serp proxy
         */
        const serpProxyEnabled = overlaySettings?.serpProxy?.state === 'enabled'

        /**
         * Bail if no features are enabled
         */
        if (!overlaysEnabled && !serpProxyEnabled) {
            return
        }

        /**
         * Bail if no messaging backend - this is a debugging feature to ensure we don't
         * accidentally enabled this
         */
        if (!this.messaging) {
            throw new Error('cannot operate duck player without a messaging backend')
        }

        const comms = new DuckPlayerOverlayMessages(this.messaging)
        const env = new Environment({
            debug: args.debug
        })

        if (overlaysEnabled) {
            const settings = this.validateOverlaySettings(overlaySettings.youtube)
            initOverlays(settings, env, comms)
        } else if (serpProxyEnabled) {
            comms.serpProxy()
        }
    }

    load (args) {
        super.load(args)
    }

    /**
     * A single place to validate the overflow settings
     * and set defaults if needed
     * @param {any} input
     * @returns {OverlaysFeatureSettings}
     */
    validateOverlaySettings (input) {
        return {
            selectors: {
                thumbLink: dlv(input, 'selectors.thumbLink', "a[href^='/watch']:has(img)" /* <-- default */),
                excludedRegions: dlv(input, 'selectors.excludedRegions',
                    ['#playlist'] /* <-- default */
                )
            },
            thumbnailOverlays: {
                state: dlv(input, 'thumbnailOverlays.state', 'enabled')
            },
            clickInterception: {
                state: dlv(input, 'clickInterception.state', 'enabled')
            },
            videoOverlays: {
                state: dlv(input, 'videoOverlays.state', 'enabled')
            }
        }
    }
}

/**
 * @typedef OverlaysFeatureSettings
 * This configuration is used within YouTube.com
 *
 * - See {@link "Duck Player Overlays"} for a full JSON example
 *
 * @property {object} selectors
 * In the config, this is under `/features/duckPlayer/settings/overlays/youtube/selectors`
 * @property {string} selectors.thumbLink - the CSS selector used to find links
 * @property {string[]} selectors.excludedRegions - CSS selectors of regions to exclude
 * @property {object} thumbnailOverlays
 * In the config, this is under `/features/duckPlayer/settings/overlays/youtube/thumbnailOverlays`
 * @property {'enabled' | 'disabled'} thumbnailOverlays.state
 * @property {object} videoOverlays
 * In the config, this is under `/features/duckPlayer/settings/overlays/youtube/videoOverlays`
 * @property {'enabled' | 'disabled'} videoOverlays.state
 * @property {object} clickInterception
 * In the config, this is under `/features/duckPlayer/settings/overlays/youtube/clickInterception`
 *
 * @property {'enabled' | 'disabled'} clickInterception.state
 */

// for docs generation
export { DuckPlayerOverlayMessages, OpenInDuckPlayerMsg, Pixel }
