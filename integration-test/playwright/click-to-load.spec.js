import { test } from '@playwright/test'
import { readFileSync } from 'fs'

test.describe('Click to load', () => {
    test('shows', async ({ page }, workerInfo) => {
        const buildArtefact = readFileSync('./build/android/contentScope.js', 'utf8')
        const config = loadConfig('placeholder')

        page.on('console', (msg) => {
            console.log(msg.type(), msg.text())
        })

        await page.goto('/click-to-load/pages/placeholder.html')
        const replaced = buildArtefact
            .replace('$CONTENT_SCOPE$', JSON.stringify(config))
            .replace('$USER_UNPROTECTED_DOMAINS$', JSON.stringify([]))
            .replace('$USER_PREFERENCES$', JSON.stringify({
                platform: { name: 'android' },
                debug: true,
                messageSecret: '123',
                messageInterface: 'ClickToLoad',
                messageCallback: 'clickToLoadMessageCallback'
            }))

        await page.evaluate(() => {
            window.__playwright_01 = {
                mockResponses: {},
                subscriptionEvents: [],
                mocks: {
                    outgoing: []
                }
            }
            // @ts-expect-error - oops
            window.ClickToLoad = {
                process: (args) => {
                    console.log('callllled')
                    window.__playwright_01.mocks.outgoing.push(args)
                }
            }
        })
        await page.evaluate(replaced)
        await page.evaluate(() => {
            // @ts-expect-error - this is a dynamic message name that we don't know about
            window.clickToLoadMessageCallback('123', {
                feature: 'clickToLoad',
                messageType: 'displayClickToLoadPlaceholders'
            })
        })
        // const calls = await page.evaluate(() => window.__playwright_01.mocks.outgoing)
        // console.log(calls)
        await page.pause()
    })
})

/**
 * @param {"placeholder"} name
 * @return {Record<string, any>}
 */
function loadConfig (name) {
    return JSON.parse(readFileSync(`./integration-test/test-pages/click-to-load/config/${name}.json`, 'utf8'))
}
