import { test } from '@playwright/test'
import { DebugToolsPage } from './page-objects/debug-tools'

test.describe.only('debug tools', () => {
    test('loads the application', async ({ page }, workerInfo) => {
        const dt = DebugToolsPage.create(page, workerInfo)
        await dt.openRemoteResourceEditor()
        await dt.hasLoaded()
    })
    test('updates a resource', async ({ page }, workerInfo) => {
        const dt = DebugToolsPage.create(page, workerInfo)
        await dt.openRemoteResourceEditor()
        await dt.hasLoaded()
        await dt.editsPreview()
        await dt.saves()
    })
    test('sets a new remote url', async ({ page }, workerInfo) => {
        const dt = DebugToolsPage.create(page, workerInfo)
        await dt.openRemoteResourceEditor()
        await dt.hasLoaded()
        await dt.setRemoteUrl()
        await dt.savesNewRemoteUrl()
    })
})
