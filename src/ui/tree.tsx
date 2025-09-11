import clsx from 'clsx'
import { Children, IntrinsicElements, Stateful } from 'ajo'

export type TreeNode = {
  content: ((args: { readonly expanded: boolean; toggle: () => void }) => Children) | Children
  children?: TreeNode[]
}

export default function ({ nodes, indent = 16, class: className, ...rest }: { nodes: TreeNode[]; indent?: number, class?: string } & Partial<IntrinsicElements['ul']>) {
  return (
    <Row class={clsx(className, 'border border-slate-200 dark:border-white/5 rounded')} {...rest}>
      {nodes.map((node, index) => <Node node={node} index={index} depth={0} indent={indent} />)}
    </Row>
  )
}

function Row({ children, class: className, ...rest }: { children: Children, class?: string } & Partial<IntrinsicElements['ul']>) {
  return (
    <ul class={clsx('divide-y divide-slate-200 dark:divide-white/5 hover:*:not-[:has(ul)]:bg-slate-200/10', className)} {...rest}>
      {children}
    </ul>
  )
}

type Props = {
  node: TreeNode
  index: number
  depth: number
  indent: number
}

const Node: Stateful<Props, 'li'> = function* (args) {

  let expanded = false

  const toggle = () => this.next(() => expanded = !expanded)

  while (true) {

    const { node, index, depth, indent } = args

    yield (
      <>
        <div class="flex items-center">
          {
            node.children?.length
              ? (
                <button
                  type="button"
                  set:onclick={() => toggle()}
                  aria-label={expanded ? 'Collapse directory' : 'Expand directory'}
                  class="inline-flex items-center justify-center size-7 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"

                >
                  <span class={clsx('i-lucide-chevron-right text-sm transition-transform', expanded ? 'rotate-90' : '')} />
                </button>
              )
              : (
                <span aria-hidden="true" class="inline-block size-7" />
              )
          }
          <div class="flex-1" style={`padding-left: ${(depth * indent) + 'px'}`}>
            {
              typeof node.content === 'function'
                ? node.content({ get expanded() { return expanded }, toggle })
                : node.content
            }
          </div>
        </div>
        {
          expanded && node.children?.length &&
          <Row class="border-t border-slate-200 dark:border-white/5">
            {node.children.map(node => <Node node={node} index={index} depth={depth + 1} indent={indent} />)}
          </Row>
        }
      </>
    )
  }
}

Node.is = 'li'
Node.attrs = { class: 'group' }
