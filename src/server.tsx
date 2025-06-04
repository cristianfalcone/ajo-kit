import { render as r } from 'ajo/html'
import App from '/src/app'

export async function render(url: string) {
  return {
    head: r(<title>Ajo SSR App</title>),
    root: r(<App url={url} />),
  }
}
