import { Fragment } from 'ajo'

export default {
	none: () => ({ default: Fragment }),
	default: () => import('./default.jsx'),
}
