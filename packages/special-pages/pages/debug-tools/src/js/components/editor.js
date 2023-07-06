/**
 * @typedef{ import('../../../schema/__generated__/schema.types').RemoteResource} RemoteResource
 * @typedef{ import('../../../schema/__generated__/schema.types').UpdateResourceParams} UpdateResourceParams
 */

import { useRef } from 'react'

/**
 * @param {{
 *    resource: RemoteResource;
 *    save: (res: UpdateResourceParams) => void;
 *    pending: boolean;
 * }} props
 */
export function Editor (props) {
    console.log('TODO: wire up the Editor and pump new values in', props.resource.current.contents)
    const ref = useRef(null)
    function save (e) {
        e.preventDefault()
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
        <form onSubmit={save}>
            <fieldset style={{ border: 'none', padding: 0 }} disabled={props.pending}>
                <textarea
                    defaultValue={props.resource.current.contents}
                    ref={ref}
                    spellCheck={false}
                    style={{ width: '100%', height: '50vh', fontSize: '12px' }}
                    name=""
                    id="resource-editor"
                    cols={30}
                    rows={10}></textarea>
                <button type={'submit'}>{props.pending ? 'saving...' : 'Save + Apply'}</button>
            </fieldset>
        </form>
    </div>
}
