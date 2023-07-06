import { h } from 'preact'
import { useRef, useState } from 'preact/hooks'
import * as z from 'zod'

/**
 * @typedef{ import('../../../schema/__generated__/schema.types').RemoteResource} RemoteResource
 * @typedef{ import('../../../schema/__generated__/schema.types').UpdateResourceParams} UpdateResourceParams
 */

/**
 * @param {{resource: RemoteResource, save: (res: UpdateResourceParams) => void, children?: import('preact').ComponentChildren }} props
 */
export function RemoteResourceUrl (props) {
    const ref = /** @type {import('preact').RefObject<HTMLInputElement>} */(useRef(null))
    const [value, setValue] = useState(props.resource.url)

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
            <div>
                <input
                    value={value}
                    onInput={(e) => setValue(/** @type {any} */(e.target).value || '')}
                    style={{
                        width: '100%',
                        fontSize: '12px'
                    }}
                    name="resource-url"
                />
            </div>
            <button type={'submit'}>Update remote url</button>
        </form>
    </div>
}
