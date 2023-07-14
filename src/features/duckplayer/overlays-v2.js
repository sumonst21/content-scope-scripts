import { applyEffect, DomState, execCleanups, VideoParams } from './util.js'
import css from './assets/styles.css'
import { IconOverlay } from './icon-overlay-v2.js'

/**
 * @typedef OverlaysFeatureSettings - a representation of what is expected from remote configuration
 * @property {object} selectors
 * @property {string} selectors.link - the CSS selector used to find links
 * @property {string[]} selectors.excludedParents - CSS selectors of regions to exclude
 * @property {object} thumbnailOverlays
 * @property {string} thumbnailOverlays.state
 * @property {object} clickInterception
 * @property {string} clickInterception.state
 */

/**
 * @param {import("./overlays.js").Environment} environment - methods to read environment-sensitive things like the current URL etc
 * @param {import("./overlay-messages.js").DuckPlayerOverlayMessages} comms - methods to communicate with a native backend
 */
export function initOverlaysV2 (environment, comms) {
    /** @type {OverlaysFeatureSettings} */
    const settings = {
        selectors: {
            link: "a[href^='/watch']:has(img)",
            excludedParents: [
                '#playlist'
            ]
        },
        thumbnailOverlays: {
            state: 'enabled'
        },
        clickInterception: {
            state: 'enabled'
        }
    }

    /**
     * @type {import("../duck-player.js").UserValues}
     */
    const userPreferences = {
        overlayInteracted: false, // not used for icon overlays
        privatePlayerMode: { alwaysAsk: {} }
    }

    /**
     * Create the instance - this might fail if settings or user preferences prevent it
     * @type {Thumbnails|undefined}
     */
    let thumbnails = fromSettings(userPreferences, settings, comms)
    if (thumbnails) {
        const domState = new DomState()
        domState.onLoaded(() => {
            thumbnails?.init()
        })
    }

    /**
     * Continue to listen for updated preferences and try to re-initiate
     */
    comms.onUserValuesChanged((userValues) => {
        thumbnails?.destroy()
        thumbnails = fromSettings(userValues, settings, comms)
    })
}

/**
 * @param {import("../duck-player.js").UserValues} userPreferences
 * @param {OverlaysFeatureSettings} settings
 * @param {import("../duck-player.js").DuckPlayerOverlayMessages} comms
 * @returns {Thumbnails | undefined}
 */
function fromSettings (userPreferences, settings, comms) {
    const showThumbs = 'alwaysAsk' in userPreferences.privatePlayerMode && settings.thumbnailOverlays.state === 'enabled'
    const interceptClicks = 'enabled' in userPreferences.privatePlayerMode && settings.clickInterception.state === 'enabled'

    let thumbnails
    if (showThumbs) {
        thumbnails = new Thumbnails({
            mode: { showOverlays: {} },
            settings
        }, comms)
    } else if (interceptClicks) {
        thumbnails = new Thumbnails({
            mode: { interceptClicks: {} },
            settings
        }, comms)
    }
    return thumbnails
}

/**
 * @typedef ThumbnailSettings
 * @property {OverlaysFeatureSettings} settings
 * @property {{interceptClicks: {}} | {showOverlays: {}}} mode
 */

/**
 * This features covers the implementation of hover-icons
 * + click interceptions
 */
class Thumbnails {
    /**
     * @param {ThumbnailSettings} params
     * @param {import("../duck-player.js").DuckPlayerOverlayMessages} comms
     */
    constructor (params, comms) {
        this.settings = params.settings
        this.mode = params.mode
        this.comms = comms
    }

    /**
     * Perform side effects
     */
    init () {
        if ('interceptClicks' in this.mode) {
            this.interceptClicks()
        } else if ('showOverlays' in this.mode) {
            this.showOverlays()
        }
    }

    /**
     * To intercept a 'click' means to evaluate all DOM nodes
     * beneath the click and match it against our selector
     */
    interceptClicks () {
        this.sideEffect('intercepting clicks', () => {
            const parentNode = document.documentElement || document.body

            const { selectors } = this.settings

            const handler = (e) => {
                const element = findElementFromEvent(selectors.link, e)
                if (element && 'href' in element) {
                    const asLink = VideoParams.fromHref(element.href)?.toPrivatePlayerUrl()
                    if (asLink) {
                        e.preventDefault()
                        e.stopPropagation()
                        console.log('click: (prevented default) ', asLink, element)
                    }
                }
            }
            parentNode.addEventListener('click', handler, true)
            return () => {
                parentNode.removeEventListener('click', handler, true)
            }
        })
    }

    /**
     * Showing overlays is about placing a small Dax icon on top of
     * thumbnails where we can offer a 'watch in duck player' alternative
     */
    showOverlays () {
        this.sideEffect('showing overlays on hover', () => {
            const parentNode = document.documentElement || document.body
            /**
             * @param {MouseEvent} e
             */
            const icon = new IconOverlay(this.comms)
            icon.appendHoverOverlay()

            const style = document.createElement('style')
            style.textContent = css
            document.head.appendChild(style)
            const { selectors } = this.settings
            const handler = (e) => {
                const hoverElement = findElementFromEvent(selectors.link, e)

                // if it's not an element we care about
                if (!hoverElement || !('href' in hoverElement)) {
                    const overlay = icon.getHoverOverlay()
                    if (overlay) {
                        icon.hideOverlay(overlay)
                        icon.hoverOverlayVisible = false
                    }
                    return
                }

                // ensure it doesn't contain sub-links
                if (hoverElement.querySelector(this.settings.selectors.link)) {
                    return
                }

                // ignore if it exists within an excluded parent
                const existsInExcludedParent = selectors.excludedParents.some(selector => {
                    for (const parent of document.querySelectorAll(selector)) {
                        if (parent.contains(hoverElement)) return true
                    }
                    return false
                })

                if (existsInExcludedParent) return

                // now try to convert to a valid duck player link
                const asLink = VideoParams.fromHref(hoverElement.href)?.toPrivatePlayerUrl()

                // if we get here, we're confident that we can link to this video + it's a valid element to append to
                if (asLink) {
                    icon.moveHoverOverlayToVideoElement(hoverElement)
                }
            }
            parentNode.addEventListener('mouseover', handler, true)

            return () => {
                parentNode.removeEventListener('mouseover', handler, true)
                icon.removeAll()
                document.head.removeChild(style)
            }
        })
    }

    destroy () {
        execCleanups(this._cleanups)
        this._cleanups = []
    }

    /** @type {{fn: () => void, name: string}[]} */
    _cleanups = []

    /**
     * Wrap a side-effecting operation for easier debugging
     * and teardown/release of resources
     * @param {string} name
     * @param {() => () => void} fn
     */
    sideEffect (name, fn) {
        applyEffect(name, fn, this._cleanups)
    }
}

/**
 * @param {string} selector
 * @param {MouseEvent} e
 * @return {HTMLElement|null}
 */
function findElementFromEvent (selector, e) {
    for (const element of document.elementsFromPoint(e.clientX, e.clientY)) {
        if (element.matches(selector)) return /** @type {HTMLElement} */(element)
    }
    return null
}
