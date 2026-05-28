import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MonthSelector } from '@/components/shared/MonthSelector'

describe('MonthSelector', () => {
  it('renders the formatted month label', () => {
    render(<MonthSelector value="2026-05" onChange={() => {}} />)
    expect(screen.getByText('May 2026')).toBeInTheDocument()
  })

  it('calls onChange with previous month when left chevron is clicked', () => {
    const onChange = vi.fn()
    render(<MonthSelector value="2026-05" onChange={onChange} />)
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    expect(onChange).toHaveBeenCalledWith('2026-04')
  })

  it('calls onChange with next month when right chevron is clicked', () => {
    const onChange = vi.fn()
    render(<MonthSelector value="2026-05" onChange={onChange} />)
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[1])
    expect(onChange).toHaveBeenCalledWith('2026-06')
  })

  it('navigates forward past current month (future month guard removed)', () => {
    const onChange = vi.fn()
    // Use whatever the "current" month is and try to go forward
    const currentMonth = new Date().toISOString().slice(0, 7)
    render(<MonthSelector value={currentMonth} onChange={onChange} />)
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[1])
    // Should NOT be disabled — onChange should fire
    expect(onChange).toHaveBeenCalled()
  })

  it('navigates across year boundary going back', () => {
    const onChange = vi.fn()
    render(<MonthSelector value="2026-01" onChange={onChange} />)
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    expect(onChange).toHaveBeenCalledWith('2025-12')
  })

  it('navigates across year boundary going forward', () => {
    const onChange = vi.fn()
    render(<MonthSelector value="2025-12" onChange={onChange} />)
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[1])
    expect(onChange).toHaveBeenCalledWith('2026-01')
  })
})
