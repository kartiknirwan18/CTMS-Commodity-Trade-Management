import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TradeFormModal from '../components/forms/TradeFormModal'
import { ApiError } from '../services/api'

vi.mock('../services/trades', () => ({
  createTrade: vi.fn(),
  updateTrade: vi.fn(),
}))

vi.mock('../services/commodities', () => ({
  listCommodities: vi.fn(),
}))

vi.mock('../services/contracts', () => ({
  listContracts: vi.fn(),
}))

import { createTrade, updateTrade } from '../services/trades'
import { listCommodities } from '../services/commodities'
import { listContracts } from '../services/contracts'

function submitForm() {
  const form = document.getElementById('trade-form')
  expect(form).not.toBeNull()
  fireEvent.submit(form)
}

describe('TradeFormModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listCommodities.mockResolvedValue([
      {
        id: 1,
        name: 'Crude Oil',
        type: 'ENERGY',
        unitOfMeasurement: 'BARREL',
        active: true,
      },
      {
        id: 2,
        name: 'Wheat',
        type: 'AGRICULTURE',
        unitOfMeasurement: 'BUSHEL',
        active: true,
      },
    ])
    listContracts.mockResolvedValue({
      content: [
        {
          id: 12,
          contractReference: 'CTR-2026-0001',
          commodityId: 1,
          status: 'ACTIVE',
        },
      ],
      page: 0,
      size: 100,
      totalElements: 1,
      totalPages: 1,
    })
  })

  it('loads commodity and contract options from the API (never hardcoded)', async () => {
    render(<TradeFormModal open onClose={() => {}} />)

    await waitFor(() => expect(listCommodities).toHaveBeenCalledWith({ active: true }))
    expect(listContracts).toHaveBeenCalled()

    expect(
      await screen.findByRole('option', { name: 'Crude Oil (BARREL)' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Wheat (BUSHEL)' })).toBeInTheDocument()
    expect(
      screen.getByRole('option', { name: 'CTR-2026-0001' }),
    ).toBeInTheDocument()
  })

  it('shows inline required-field errors and never calls the API', async () => {
    render(<TradeFormModal open onClose={() => {}} />)
    await screen.findByRole('option', { name: 'Crude Oil (BARREL)' })

    submitForm()

    expect(screen.getByText('Commodity is required')).toBeInTheDocument()
    expect(screen.getByText('Quantity is required')).toBeInTheDocument()
    expect(screen.getByText('Price per unit is required')).toBeInTheDocument()
    expect(screen.getByText('Counterparty is required')).toBeInTheDocument()
    expect(createTrade).not.toHaveBeenCalled()
  })

  it('rejects a quantity of zero', async () => {
    const user = userEvent.setup()
    render(<TradeFormModal open onClose={() => {}} />)
    await screen.findByRole('option', { name: 'Crude Oil (BARREL)' })

    await user.selectOptions(screen.getByLabelText(/^Commodity\b/), '1')
    await user.type(screen.getByLabelText(/^Quantity/), '0')
    await user.type(screen.getByLabelText(/^Price per unit/), '78.5')
    await user.type(screen.getByLabelText(/^Counterparty/), 'Glencore')

    submitForm()

    expect(
      screen.getByText('Quantity must be greater than zero'),
    ).toBeInTheDocument()
    expect(createTrade).not.toHaveBeenCalled()
  })

  it('surfaces backend field errors (400) on submit', async () => {
    createTrade.mockRejectedValueOnce(
      new ApiError({
        message: 'Validation failed',
        status: 400,
        fieldErrors: [
          { field: 'contractId', message: 'Linked contract is not active' },
        ],
      }),
    )

    const user = userEvent.setup()
    render(<TradeFormModal open onClose={() => {}} />)
    await screen.findByRole('option', { name: 'Crude Oil (BARREL)' })

    await user.selectOptions(screen.getByLabelText(/^Commodity\b/), '1')
    await user.type(screen.getByLabelText(/^Quantity/), '1000')
    await user.type(screen.getByLabelText(/^Price per unit/), '78.5')
    await user.type(screen.getByLabelText(/^Counterparty/), 'Glencore')

    submitForm()

    expect(
      await screen.findByText('Linked contract is not active'),
    ).toBeInTheDocument()
    expect(screen.getByText('Request failed (400)')).toBeInTheDocument()
  })

  it('sends the exact TradeRequest payload with a null contract and auto-generated reference', async () => {
    createTrade.mockResolvedValueOnce({ id: 5, tradeReference: 'TRD-2026-0001' })
    const onSaved = vi.fn()

    const user = userEvent.setup()
    render(<TradeFormModal open onClose={() => {}} onSaved={onSaved} />)
    await screen.findByRole('option', { name: 'Crude Oil (BARREL)' })

    await user.selectOptions(screen.getByLabelText(/^Commodity\b/), '1')
    await user.type(screen.getByLabelText(/^Quantity/), '1000')
    await user.type(screen.getByLabelText(/^Price per unit/), '78.5')
    await user.type(screen.getByLabelText(/^Counterparty/), 'Glencore')
    fireEvent.change(screen.getByLabelText(/^Trade date/), {
      target: { value: '2026-10-01' },
    })

    submitForm()

    await waitFor(() => expect(createTrade).toHaveBeenCalledTimes(1))
    expect(createTrade).toHaveBeenCalledWith({
      tradeReference: '',
      commodityId: 1,
      tradeType: 'BUY',
      quantity: 1000,
      pricePerUnit: 78.5,
      tradeDate: '2026-10-01',
      counterparty: 'Glencore',
      contractId: null,
      status: 'DRAFT',
    })
    expect(updateTrade).not.toHaveBeenCalled()
    await waitFor(() =>
      expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: 5 })),
    )
  })

  it('includes the selected linked contract when one is chosen', async () => {
    createTrade.mockResolvedValueOnce({ id: 6, tradeReference: 'TRD-2026-0002' })

    const user = userEvent.setup()
    render(<TradeFormModal open onClose={() => {}} />)
    await screen.findByRole('option', { name: 'CTR-2026-0001' })

    await user.selectOptions(screen.getByLabelText(/^Commodity\b/), '1')
    await user.selectOptions(screen.getByLabelText(/^Linked contract/), '12')
    await user.type(screen.getByLabelText(/^Quantity/), '250')
    await user.type(screen.getByLabelText(/^Price per unit/), '80')
    await user.type(screen.getByLabelText(/^Counterparty/), 'Vitol')
    fireEvent.change(screen.getByLabelText(/^Trade date/), {
      target: { value: '2026-10-05' },
    })

    submitForm()

    await waitFor(() => expect(createTrade).toHaveBeenCalledTimes(1))
    expect(createTrade.mock.calls[0][0]).toMatchObject({
      commodityId: 1,
      contractId: 12,
      quantity: 250,
      pricePerUnit: 80,
      counterparty: 'Vitol',
      tradeDate: '2026-10-05',
    })
  })
})
