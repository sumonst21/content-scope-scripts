import { getMachine } from '../machine'
import { createActorContext } from '@xstate/react'
import { RemoteResources } from './remote-resources'

export const baseMachine = getMachine()
export const AppMachineContext = createActorContext(baseMachine, { devTools: true })

export function App () {
    // Read full snapshot and get `send` function from `useActor()`
    const [state] = AppMachineContext.useActor()

    return (
        <main data-loaded="true">
            {state.matches('showing remote resources feature') ? <RemoteResources /> : null}
        </main>
    )
}
