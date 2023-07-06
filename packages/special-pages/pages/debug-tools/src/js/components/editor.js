import { h } from 'preact'
import { useRef } from 'preact/hooks'

/**
 * @typedef{ import('../../../schema/__generated__/schema.types').RemoteResource} RemoteResource
 * @typedef{ import('../../../schema/__generated__/schema.types').UpdateResourceParams} UpdateResourceParams
 */

/**
 * @param {{resource: RemoteResource, save: (res: UpdateResourceParams) => void, children?: import("preact").ComponentChildren }} props
 */
export function Editor (props) {
    const ref = /** @type {import("preact").RefObject<HTMLTextAreaElement>} */(useRef(null))
    function save () {
        if (!ref) return
        const next = ref.current?.value
        props.save({
            id: props.resource.id,
            source: {
                debugTools: {
                    content: String(next)
                }
            }
        })
    }
    return <div>
        <p>
            {props.resource.url}
        </p>
        <div>
            <textarea
                defaultValue={props.resource.current.contents}
                ref={ref}
                spellcheck={false}
                style={{ width: '100%', height: '50vh', fontSize: '12px' }}
                name=""
                id="resource-editor"
                cols={30}
                rows={10}></textarea>
        </div>
        <button type={'button'} onClick={save}>Save + Apply</button>
    </div>
}
