import * as z from 'zod'
import { useRef, useState } from 'react'

/**
 * @typedef{ import('../../../schema/__generated__/schema.types').RemoteResource} RemoteResource
 * @typedef{ import('../../../schema/__generated__/schema.types').UpdateResourceParams} UpdateResourceParams
 */

/**
 * @param {{
 *   resource: RemoteResource;
 *   save: (res: UpdateResourceParams) => void;
 *   pending: boolean;
 * }} props
 */
export function RemoteResourceUrl (props) {
    const ref = useRef(null)
    const [value, setValue] = useState(() => {
        if ('remote' in props.resource.current.source) {
            return props.resource.current.source.remote.url
        }
        if ('debugTools' in props.resource.current.source) {
            return '<debugTools>'
        }
        throw new Error('unreachable')
    })

    function save (e) {
        e.preventDefault()
        if (!ref) return
        const formData = Object.fromEntries(new FormData(e.target))
        const schema = z.object({
            'resource-url': z.string()
        })
        const data = schema.parse(formData)
        props.save({
            id: props.resource.id,
            source: {
                remote: {
                    url: data['resource-url']
                }
            }
        })
    }

    return <div>
        <form onSubmit={save} id="remote-resource-url">
            <fieldset style={{ border: 'none', padding: 0 }} disabled={props.pending}>
                <input
                    value={value}
                    onInput={(e) => setValue(/** @type {any} */(e.target).value || '')}
                    style={{
                        width: '100%',
                        fontSize: '12px'
                    }}
                    name="resource-url"
                />
            </fieldset>
            <button type={'submit'}>{props.pending ? 'saving....' : 'Update remote url'}</button>
            <small style={{ color: 'gray' }}>Note: refresh to see changes in main editor after updating remote</small>
        </form>
    </div>
}
