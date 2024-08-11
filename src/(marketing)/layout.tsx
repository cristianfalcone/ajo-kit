import { Children, Component } from 'ajo'
import { QueryClientContext } from '../constants'
import { QueryClient } from '@tanstack/query-core'

type Props = {
  children: Children
}

export default (function* (props) {

	QueryClientContext(new QueryClient())

  while (true) yield (
    <>
      <div class="bg-blue-600 p-4 text-white text-2xl">
        Marketing Layout
      </div>
      {props.children}
    </>
  )
}) as Component<Props>
