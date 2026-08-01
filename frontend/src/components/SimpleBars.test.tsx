import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SimpleBars from './SimpleBars'

const fmt = (v: number) => `₹${v}`

describe('SimpleBars', () => {
  it('renders a bar per item with a tooltip', () => {
    const html = renderToStaticMarkup(
      <SimpleBars data={[{ label: 'Jan', value: 10 }, { label: 'Feb', value: 20 }]} format={fmt} />,
    )
    expect(html).toContain('title="Jan: ₹10"')
    expect(html).toContain('title="Feb: ₹20"')
    expect(html).toContain('Jan')
    expect(html).toContain('Feb')
  })

  it('scales heights relative to the max value', () => {
    const html = renderToStaticMarkup(
      <SimpleBars data={[{ label: 'A', value: 5 }, { label: 'B', value: 10 }]} format={fmt} />,
    )
    expect(html).toContain('height:50%')
    expect(html).toContain('height:100%')
  })

  it('keeps a zero value visible with a tiny bar', () => {
    const html = renderToStaticMarkup(
      <SimpleBars data={[{ label: 'A', value: 0 }, { label: 'B', value: 10 }]} format={fmt} />,
    )
    expect(html).toContain('height:1%')
  })

  it('renders the hint label when provided', () => {
    const html = renderToStaticMarkup(
      <SimpleBars data={[{ label: 'Jan 2026', value: 1, hint: 'J26' }]} format={fmt} />,
    )
    expect(html).toContain('J26')
  })

  it('renders nothing when data is empty', () => {
    const html = renderToStaticMarkup(<SimpleBars data={[]} format={fmt} />)
    expect(html).not.toContain('title=')
  })
})
