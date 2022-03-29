import { Skip } from 'ajo'

const random = max => Math.round(Math.random() * 1000) % max

const A = [
  "pretty",
  "large",
  "big",
  "small",
  "tall",
  "short",
  "long",
  "handsome",
  "plain",
  "quaint",
  "clean",
  "elegant",
  "easy",
  "angry",
  "crazy",
  "helpful",
  "mushy",
  "odd",
  "unsightly",
  "adorable",
  "important",
  "inexpensive",
  "cheap",
  "expensive",
  "fancy",
]

const C = [
  "red",
  "yellow",
  "blue",
  "green",
  "pink",
  "brown",
  "purple",
  "brown",
  "white",
  "black",
  "orange",
]

const N = [
  "table",
  "chair",
  "house",
  "bbq",
  "desk",
  "car",
  "pony",
  "cookie",
  "sandwich",
  "burger",
  "pizza",
  "mouse",
  "keyboard",
]

let nextId = 1

const buildData = count => {
  const data = new Array(count)
  for (let i = 0; i < count; i++) {
    data[i] = {
      id: nextId++,
      label: `${A[random(A.length)]} ${C[random(C.length)]} ${N[random(N.length)]}`,
    }
  }
  return data
}

const Row = ({ selected, item, dispatch }) => {
  return (
    <tr class={selected ? "danger" : null} key={item.id + ''}>
      <td class="col-md-1">{item.id}</td>
      <td class="col-md-4">
        <a onclick={() => dispatch('SELECT', item.id)}>{item.label}</a>
      </td>
      <td class="col-md-1">
        <a onclick={() => dispatch('REMOVE', item.id)}>
          <span class="glyphicon glyphicon-remove" aria-hidden="true" />
        </a>
      </td>
      <td class="col-md-6" />
    </tr>
  )
}

const Button = ({ id, cb, title }) => (
  <div class="col-sm-6 smallpad">
    <button
      type="button"
      class="btn btn-primary btn-block"
      id={id}
      onclick={cb}
    >
      {title}
    </button>
  </div>
)

const Jumbotron = ({ ref, dispatch }) => (
  <div class="jumbotron" ref={ref}>
    <div class="row">
      <div class="col-md-6">
        <h1>ajo keyed</h1>
      </div>
      <div class="col-md-6">
        <div class="row">
          <Button
            id="run"
            title="Create 1,000 rows"
            cb={() => dispatch("RUN")}
          />
          <Button
            id="runlots"
            title="Create 10,000 rows"
            cb={() => dispatch("RUN_LOTS")}
          />
          <Button
            id="add"
            title="Append 1,000 rows"
            cb={() => dispatch("ADD")}
          />
          <Button
            id="update"
            title="Update every 10th row"
            cb={() => dispatch("UPDATE")}
          />
          <Button
            id="clear"
            title="Clear"
            cb={() => dispatch("CLEAR")}
          />
          <Button
            id="swaprows"
            title="Swap Rows"
            cb={() => dispatch("SWAP_ROWS")}
          />
        </div>
      </div>
    </div>
  </div>
)

export default function* Main() {
  let data = []
  let selected = 0

  const dispatch = (action, payload) => {
    switch (action) {
      case 'RUN':
        data = buildData(1000)
        selected = 0
        break
      case 'RUN_LOTS':
        data = buildData(10000)
        selected = 0
        break
      case 'ADD':
        data.push(...buildData(1000))
        break
      case 'UPDATE':
        for (let i = 0; i < data.length; i += 10) data[i].label += " !!!"
        break
      case 'CLEAR':
        data = []
        selected = 0
        break
      case 'REMOVE':
        data.splice(data.findIndex(d => d.id === payload), 1)
        break
      case 'SELECT':
        selected = payload
        break
      case 'SWAP_ROWS':
        if (data.length > 998) [data[1], data[998]] = [data[998], data[1]]
        break
    }

    this.update()
  }

  const jumbotron = { current: null }

  for ({} of this) yield (
    <div class="container">
      {jumbotron.current ? <Skip /> : <Jumbotron dispatch={dispatch} ref={jumbotron} />}
      <table class="table table-hover table-striped test-data">
        <tbody>
          {data.map((item) => <Row item={item} selected={selected === item.id} dispatch={dispatch} />)}
        </tbody>
      </table>
      <span class="preloadicon glyphicon glyphicon-remove" aria-hidden="true"></span>
    </div>
  )
}

export const layout = 'none'
