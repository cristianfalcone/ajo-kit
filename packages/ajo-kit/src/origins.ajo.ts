import { readText } from 'runtime:fs'
import { setOriginReader } from './constants'

setOriginReader(readText)
