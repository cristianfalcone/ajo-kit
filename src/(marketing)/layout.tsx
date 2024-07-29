import { Children } from 'ajo'

type Props = {
  children: Children
}

export default (props: Props) =>
  <>
    <div class="bg-blue-600 p-4 text-white text-2xl">
      Marketing Layout
    </div>
    {props.children}
  </>
