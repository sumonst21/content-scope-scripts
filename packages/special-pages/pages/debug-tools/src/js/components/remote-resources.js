/**
 * @typedef{ import('../../../../../../messaging/index.js').MessagingTransport} MessagingTransport
 * @typedef{ import('../../../schema/__generated__/schema.types').GetFeaturesResponse} GetFeaturesResponse
 */

import { AppMachineContext } from './app'
import { remoteResourceSchema } from '../../../schema/__generated__/schema.parsers.mjs'
import { Editor } from './editor'
import { RemoteResourceUrl } from './remote-resource-url'
import * as z from 'zod'

/**
 * @typedef{ import('../../../schema/__generated__/schema.types').RemoteResource} RemoteResource
 * @typedef{ import('../../../schema/__generated__/schema.types').UpdateResourceParams} UpdateResourceParams
 */

export function RemoteResources () {
    const [state, send] = AppMachineContext.useActor()
    const selectedResource = AppMachineContext.useSelector(resourceSelector)

    const error = AppMachineContext.useSelector((state) => {
        const schema = z.object({
            error: z.union([z.string(), z.null()]).optional()
        })
        return schema.parse(state.context).error
    })

    const resourceKey = AppMachineContext.useSelector((state) => {
        const schema = z.object({
            resourceKey: z.number()
        })
        return schema.parse(state.context).resourceKey
    })

    /**
     * @param {UpdateResourceParams} resp
     */
    function saveNewRemote (resp) {
        send({ type: 'save new remote', payload: resp })
    }

    /**
     * @param {UpdateResourceParams} resp
     */
    function saveEdited (resp) {
        send({ type: 'save edited', payload: resp })
    }

    const errorState = state.matches(['showing remote resources feature', 'showing editor', 'errors', 'some'])
    const savingRemote = state.matches(['showing remote resources feature', 'showing editor', 'editing', 'saving new remote'])
    const savingChanges = state.matches(['showing remote resources feature', 'showing editor', 'editing', 'saving edited'])

    return (
        <div>
            {state.matches(['showing remote resources feature', 'resourceInvalid'])
                ? error
                : null
            }
            {state.matches(['showing remote resources feature', 'showing editor', 'editing'])
                ? <RemoteResourceEditor>
                    {errorState ? <p style={{ color: 'red' }}>{error}</p> : null}
                    <p>Resource key: {JSON.stringify(resourceKey)}</p>
                    <RemoteResourceUrl key={'remote-' + resourceKey} resource={selectedResource} pending={savingRemote} save={saveNewRemote}></RemoteResourceUrl>
                    <Editor key={'editor-' + resourceKey} pending={savingChanges} resource={selectedResource} save={saveEdited}></Editor>
                </RemoteResourceEditor>
                : <p>plz wait...</p>
            }
        </div>
    )
}

function RemoteResourceEditor (props) {
    return (
        <div>
            {props.children}
        </div>
    )
}

/**
 * @param state
 * @return {RemoteResource}
 */
export function resourceSelector (state) {
    const schema = z.object({
        currentResource: z.string(),
        resources: z.array(remoteResourceSchema)
    })
    const parsed = schema.parse(state.context)
    const match = parsed.resources.find(re => re.id === parsed.currentResource)
    if (!match) throw new Error('unreachable, could not access ' + parsed.currentResource + ' in context')
    return match
}
