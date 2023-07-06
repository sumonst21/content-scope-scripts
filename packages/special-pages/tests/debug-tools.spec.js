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
    test('shows an error on updating a resource', async ({ page }, workerInfo) => {
        const dt = DebugToolsPage.create(page, workerInfo)
        await dt.openRemoteResourceEditor()
        await dt.hasLoaded()
        await dt.setRemoteUrl()
        await dt.willReceiveError({ message: 'oops!', method: 'updateResource' })
        await dt.submitsResourceForm()
        await dt.showsErrorText('oops!')
    })
    test('shows an error on updating in the editor', async ({ page }, workerInfo) => {
        const dt = DebugToolsPage.create(page, workerInfo)
        await dt.openRemoteResourceEditor()
        await dt.hasLoaded()
        await dt.willReceiveError({ message: 'oops 2!', method: 'updateResource' })
        await dt.editsPreview()
        await dt.submitsEditorSave()
        await dt.showsErrorText('oops 2!')
    })
})
