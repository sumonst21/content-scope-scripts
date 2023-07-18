import { DomState } from './util.js'
import { Thumbnails } from './thumbnails.js'
import { VideoOverlayManager } from './video-overlay-manager.js'
import { registerCustomElements } from './components/index.js'

/**
 * @typedef OverlaysFeatureSettings - a representation of what is expected from remote configuration
 * @property {object} selectors
 * @property {string} selectors.thumbLink - the CSS selector used to find links
 * @property {string[]} selectors.excludedParents - CSS selectors of regions to exclude
 * @property {object} thumbnailOverlays
 * @property {string} thumbnailOverlays.state
 * @property {object} videoOverlays
 * @property {string} videoOverlays.state
 * @property {object} clickInterception
 * @property {string} clickInterception.state
 */

/**
 * @param {import("./overlays.js").Environment} environment - methods to read environment-sensitive things like the current URL etc
 * @param {import("./overlay-messages.js").DuckPlayerOverlayMessages} messages - methods to communicate with a native backend
 */
export async function initOverlaysV2 (environment, messages) {
    /** @type {OverlaysFeatureSettings} */
    const settings = {
        selectors: {
            thumbLink: "a[href^='/watch']:has(img)",
            excludedParents: [
                '#playlist'
            ]
        },
        thumbnailOverlays: {
            state: 'enabled'
        },
        clickInterception: {
            state: 'enabled'
        },
        videoOverlays: {
            state: 'enabled'
        }
    }

    // bind early to attach all listeners
    const domState = new DomState()

    /** @type {import("../duck-player.js").UserValues} */
    let userValues
    try {
        userValues = await messages.getUserValues()
    } catch (e) {
        console.error(e)
        return
    }

    if (!userValues) {
        console.log('cannot continue without user settings')
        return
    }

    /**
     * Create the instance - this might fail if settings or user preferences prevent it
     * @type {Thumbnails|undefined}
     */
    let thumbnails = thumbnailsFeatureFromSettings(userValues, settings, messages)
    let videoOverlays = videoOverlaysFeatureFromSettings(userValues, settings, messages, environment)

    if (thumbnails || videoOverlays) {
        if (videoOverlays) {
            registerCustomElements()
        }
        domState.onLoaded(() => {
            thumbnails?.init()
            videoOverlays?.init('page-load')

            const title = document.head.querySelector('title')

            const m = new MutationObserver((records) => {
                for (const record of records) {
                    if (record.target === title) {
                        if (record.addedNodes) {
                            videoOverlays?.watchForVideoBeingAdded({ via: 'title changed' })
                        }
                    }
                }
            })
            m.observe(document.head, { childList: true, subtree: true })
        })
    }

    function update () {
        thumbnails?.destroy()
        videoOverlays?.destroy()

        // re-create thumbs
        thumbnails = thumbnailsFeatureFromSettings(userValues, settings, messages)
        thumbnails?.init()

        // re-create video overlay
        videoOverlays = videoOverlaysFeatureFromSettings(userValues, settings, messages, environment)
        videoOverlays?.init('preferences-changed')
    }

    /**
     * Continue to listen for updated preferences and try to re-initiate
     */
    messages.onUserValuesChanged(_userValues => {
        userValues = _userValues
        update()
    })
}

/**
 * @param {import("../duck-player.js").UserValues} userPreferences
 * @param {OverlaysFeatureSettings} settings
 * @param {import("../duck-player.js").DuckPlayerOverlayMessages} messages
 * @returns {Thumbnails | undefined}
 */
function thumbnailsFeatureFromSettings (userPreferences, settings, messages) {
    const showThumbs = 'alwaysAsk' in userPreferences.privatePlayerMode && settings.thumbnailOverlays.state === 'enabled'
    const interceptClicks = 'enabled' in userPreferences.privatePlayerMode && settings.clickInterception.state === 'enabled'

    let thumbnails
    if (showThumbs) {
        thumbnails = new Thumbnails({
            mode: { showOverlays: {} },
            settings
        }, messages)
    } else if (interceptClicks) {
        thumbnails = new Thumbnails({
            mode: { interceptClicks: {} },
            settings
        }, messages)
    }
    return thumbnails
}

/**
 * @param {import("../duck-player.js").UserValues} userValues
 * @param {OverlaysFeatureSettings} settings
 * @param {import("../duck-player.js").DuckPlayerOverlayMessages} messages
 * @param {import("./overlays.js").Environment} environment
 * @returns {VideoOverlayManager | undefined}
 */
function videoOverlaysFeatureFromSettings (userValues, settings, messages, environment) {
    if (settings.videoOverlays.state !== 'enabled') return undefined

    return new VideoOverlayManager(userValues, environment, messages)
}