import ContentFeature from '../content-feature'

/**
 * Fixes incorrect sizing value for outerHeight and outerWidth
 */
function windowSizingFix () {
    if (window.outerHeight !== 0 && window.outerWidth !== 0) {
        return
    }
    window.outerHeight = window.innerHeight
    window.outerWidth = window.innerWidth
}

/**
 * Notification fix for adding missing API for Android WebView.
 */
function notificationFix () {
    if (window.Notification) {
        return
    }
    const Notification = () => {
        // noop
    }
    Notification.requestPermission = () => {
        return Promise.resolve({ permission: 'denied' })
    }
    Notification.permission = 'denied'
    Notification.maxActions = 2

    // Expose the API
    // @ts-expect-error window.Notification isn't assignable
    window.Notification = Notification
}

/**
 * Adds missing permissions API for Android WebView.
 */
function permissionsFix (settings) {
    if (window.navigator.permissions) {
        return
    }
    // @ts-expect-error window.navigator isn't assignable
    window.navigator.permissions = {}
    class PermissionStatus extends EventTarget {
        constructor (name, state) {
            super()
            this.name = name
            this.state = state
            this.onchange = null // noop
        }
    }
    // Default subset based upon Firefox (the full list is pretty large right now and these are the common ones)
    const defaultValidPermissionNames = [
        'geolocation',
        'notifications',
        'push',
        'persistent-storage',
        'midi'
    ]
    const validPermissionNames = settings.validPermissionNames || defaultValidPermissionNames
    window.navigator.permissions.query = (query) => {
        if (!query) {
            throw new TypeError("Failed to execute 'query' on 'Permissions': 1 argument required, but only 0 present.")
        }
        if (!query.name) {
            throw new TypeError("Failed to execute 'query' on 'Permissions': Failed to read the 'name' property from 'PermissionDescriptor': Required member is undefined.")
        }
        if (!validPermissionNames.includes(query.name)) {
            throw new TypeError("Failed to execute 'query' on 'Permissions': Failed to read the 'name' property from 'PermissionDescriptor': The provided value 's' is not a valid enum value of type PermissionName.")
        }
        return Promise.resolve(new PermissionStatus(query.name, 'denied'))
    }
}

export default class WebCompat extends ContentFeature {
    init () {
        if (this.getFeatureSettingEnabled('windowSizing')) {
            windowSizingFix()
        }
        if (this.getFeatureSettingEnabled('navigatorCredentials')) {
            this.navigatorCredentialsFix()
        }
        if (this.getFeatureSettingEnabled('safariObject')) {
            this.safariObjectFix()
        }
        if (this.getFeatureSettingEnabled('messageHandlers')) {
            this.messageHandlersFix()
        }
    }

    /**
     * Add missing navigator.credentials API
     */
    navigatorCredentialsFix () {
        try {
            if ('credentials' in navigator && 'get' in navigator.credentials) {
                return
            }
            // TODO: change the property descriptor shape to match the original
            const value = {
                get () {
                    return Promise.reject(new Error())
                }
            }
            this.defineProperty(Navigator.prototype, 'credentials', {
                value,
                configurable: true,
                enumerable: true
            })
        } catch {
            // Ignore exceptions that could be caused by conflicting with other extensions
        }
    }

    safariObjectFix () {
        try {
            // @ts-expect-error https://app.asana.com/0/1201614831475344/1203979574128023/f
            if (window.safari) {
                return
            }
            this.defineProperty(window, 'safari', {
                value: {
                },
                configurable: true,
                enumerable: true
            })
            // @ts-expect-error https://app.asana.com/0/1201614831475344/1203979574128023/f
            this.defineProperty(window.safari, 'pushNotification', {
                value: {
                },
                configurable: true,
                enumerable: true
            })
            // @ts-expect-error https://app.asana.com/0/1201614831475344/1203979574128023/f
            this.defineProperty(window.safari.pushNotification, 'toString', {
                value: () => { return '[object SafariRemoteNotification]' },
                configurable: true,
                enumerable: true
            })
            class SafariRemoteNotificationPermission {
                constructor () {
                    this.deviceToken = null
                    this.permission = 'denied'
                }
            }
            // @ts-expect-error https://app.asana.com/0/1201614831475344/1203979574128023/f
            this.defineProperty(window.safari.pushNotification, 'permission', {
                value: () => {
                    return new SafariRemoteNotificationPermission()
                },
                configurable: true,
                enumerable: true
            })
            // @ts-expect-error https://app.asana.com/0/1201614831475344/1203979574128023/f
            this.defineProperty(window.safari.pushNotification, 'requestPermission', {
                value: (name, domain, options, callback) => {
                    if (typeof callback === 'function') {
                        callback(new SafariRemoteNotificationPermission())
                        return
                    }
                    const reason = "Invalid 'callback' value passed to safari.pushNotification.requestPermission(). Expected a function."
                    throw new Error(reason)
                },
                configurable: true,
                enumerable: true
            })
        } catch {
            // Ignore exceptions that could be caused by conflicting with other extensions
        }
        if (this.getFeatureSettingEnabled('notification')) {
            notificationFix()
        }
        if (this.getFeatureSettingEnabled('permissions')) {
            const settings = this.getFeatureSettingEnabled('permissions')
            permissionsFix(settings)
        }
    }

    /**
     * Support for proxying `window.webkit.messageHandlers`
     */
    messageHandlersFix () {
        const settings = this.getFeatureSetting('messageHandlers')

        // Do nothing if `messageHandlers` is absent
        if (!globalThis.webkit?.messageHandlers) return

        const proxy = new Proxy(globalThis.webkit.messageHandlers, {
            get (target, messageName, receiver) {
                const handlerName = String(messageName)

                // handle known message names, such as DDG webkit messaging
                if (settings.handlerStrategies.reflect.includes(handlerName)) {
                    return Reflect.get(target, messageName, receiver)
                }

                if (settings.handlerStrategies.undefined.includes(handlerName)) {
                    return undefined
                }

                if (settings.handlerStrategies.polyfill.includes('*') ||
                    settings.handlerStrategies.polyfill.includes(handlerName)
                ) {
                    return {
                        postMessage () {
                            return Promise.resolve({})
                        }
                    }
                }
                // if we get here, we couldn't handle the message handler name, so we opt for doing nothing.
                // It's unlikely we'll ever reach here, since `["*"]' should be present
            }
        })

        globalThis.webkit = {
            ...globalThis.webkit,
            messageHandlers: proxy
        }
    }
}
