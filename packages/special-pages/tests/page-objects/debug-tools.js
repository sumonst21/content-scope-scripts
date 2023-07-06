import { expect } from '@playwright/test'
import { Mocks } from './mocks.js'
import { perPlatform } from '../../../../integration-test/playwright/type-helpers.mjs'

/**
 * @typedef {import('../../../../integration-test/playwright/type-helpers.mjs').Build} Build
 * @typedef {import('../../../../integration-test/playwright/type-helpers.mjs').PlatformInfo} PlatformInfo
 * @typedef {import('../../pages/debug-tools/schema/__generated__/schema.types').GetFeaturesResponse} GetFeaturesResponse
 * @typedef {import('../../pages/debug-tools/schema/__generated__/schema.types').RemoteResource} RemoteResource
 */

export class DebugToolsPage {
    /**
     * @param {import("@playwright/test").Page} page
     * @param {Build} build
     * @param {PlatformInfo} platform
     */
    constructor (page, build, platform) {
        this.page = page
        this.build = build
        this.platform = platform
        this.mocks = new Mocks(page, build, platform, {
            context: 'specialPages',
            featureName: 'debugToolsPage',
            env: 'development'
        })

        // default mocks - just enough to render the first page without error
        /** @type {RemoteResource} */
        const resource = {
            id: 'privacy-configuration',
            url: 'https://example.com/macos-config.json',
            name: 'Privacy Config',
            current: {
                source: {
                    remote: {
                        url: 'https://example.com/macos-config.json',
                        fetchedAt: '2023-07-05T12:34:56Z'
                    }
                },
                contents: '{ "foo": "bar" }',
                contentType: 'application/json'
            }
        }

        /** @type {GetFeaturesResponse} */
        const getFeatures = {
            features: {
                remoteResources: {
                    resources: [resource]
                }
            }
        }

        this.mocks.defaultResponses({
            getFeatures,
            updateResource: resource
        })

        page.on('console', (msg) => {
            console.log(msg.type(), msg.text())
        })
    }

    /**
     * This ensures we can choose when to apply mocks based on the platform
     * @param {URLSearchParams} urlParams
     * @return {Promise<void>}
     */
    async openPage (urlParams) {
        const url = this.basePath + '?' + urlParams.toString()
        await this.installRemoteMocks()
        await this.mocks.install()
        await this.page.goto(url)
    }

    /**
     * Used later if/when we might want to simulate fetching remote config
     * @return {Promise<void>}
     */
    async installRemoteMocks () {
        // default: https://staticcdn.duckduckgo.com/trackerblocking/config/v2/macos-config.json
        await this.page.route('https://example.com/**', (route, req) => {
            const url = new URL(req.url())
            if (url.pathname === '/override.json') {
                return route.fulfill({
                    status: 200,
                    json: {}
                })
            }
            return route.continue()
        })
    }

    /**
     * @returns {Promise<void>}
     */
    async openRemoteResourceEditor () {
        const params = new URLSearchParams({})
        await this.openPage(params)
    }

    /**
     * @returns {Promise<void>}
     */
    async hasLoaded () {
        // this makes sure the JS is compiled/loaded
        await this.page.locator('main[data-loaded=true]').waitFor()
    }

    /**
     *
     */
    async editsPreview () {
        // this makes sure the JS is compiled/loaded
        await this.page.locator('#resource-editor')
            .fill('{ "foo": "baz" }')
    }

    async saves () {
        await this.page.getByRole('button', { name: 'Save + Apply' }).click()
        const calls = await this.mocks.waitForCallCount({ method: 'updateResource', count: 1 })
        expect(calls[0].payload.params).toMatchObject({
            id: 'privacy-configuration',
            source: {
                debugTools: {
                    content: '{ "foo": "baz" }'
                }
            }
        })
    }

    async setRemoteUrl () {
        await this.page.locator('#remote-resource-url input[name="resource-url"]')
            .fill('https://example.com/override.json')
    }

    async savesNewRemoteUrl () {
        await this.page.locator('#remote-resource-url button[type="submit"]').click()
        const calls = await this.mocks.waitForCallCount({ method: 'updateResource', count: 1 })
        expect(calls[0].payload.params).toMatchObject({
            id: 'privacy-configuration',
            source: {
                remote: {
                    url: 'https://example.com/override.json'
                }
            }
        })
    }

    /**
     * We test the fully built artifacts, so for each test run we need to
     * select the correct HTML file.
     * @return {string}
     */
    get basePath () {
        return this.build.switch({
            windows: () => '../../build/windows/pages/debug-tools/index.html',
            apple: () => '../../Sources/ContentScopeScripts/dist/pages/debug-tools/index.html'
        })
    }

    /**
     * @param {import("@playwright/test").Page} page
     * @param {import("@playwright/test").TestInfo} testInfo
     */
    static create (page, testInfo) {
        // Read the configuration object to determine which platform we're testing against
        const { platformInfo, build } = perPlatform(testInfo.project.use)
        return new DebugToolsPage(page, build, platformInfo)
    }
}
