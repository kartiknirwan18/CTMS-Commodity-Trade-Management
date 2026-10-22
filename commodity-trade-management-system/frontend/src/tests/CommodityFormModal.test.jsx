import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CommodityFormModal from '../components/forms/CommodityFormModal'
import { ApiError } from '../services/api'

vi.mock('../services/commodities', () => ({
  createCommodity: vi.fn(),
  updateCommodity: vi.fn(),
}))

import { createCommodity, updateCommodity } from '../services/commodities'

/** The modal footer button submits the form via the `form` attribute. */
function submitForm() {
  const form = document.getElementById('commodity-form')
  expect(form).not.toBeNull()
  fireEvent.submit(form)
}

describe('CommodityFormModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders create mode with accessible labelled fields', () => {
    render(<CommodityFormModal open onClose={() => {}} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Name/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Type/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Unit of measurement/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create commodity/i })).toBeInTheDocument()
  })

  it('shows inline required-field errors and never calls the API', () => {
    render(<CommodityFormModal open onClose={() => {}} />)

    submitForm()

    expect(screen.getByText('Name is required')).toBeInTheDocument()
    expect(screen.getByText('Commodity type is required')).toBeInTheDocument()
    expect(screen.getByText('Unit of measurement is required')).toBeInTheDocument()
    expect(createCommodity).not.toHaveBeenCalled()
  })

  it('marks invalid inputs with aria-invalid', () => {
    render(<CommodityFormModal open onClose={() => {}} />)
    submitForm()
    expect(screen.getByLabelText(/^Name/)).toHaveAttribute('aria-invalid', 'true')
  })

  it('surfaces a duplicate-name 409 error from the backend', async () => {
    createCommodity.mockRejectedValueOnce(
      new ApiError({
        message: 'A commodity with this name already exists',
        status: 409,
        fieldErrors: [{ field: 'name', message: 'Name already exists' }],
      }),
    )

    const user = userEvent.setup()
    render(<CommodityFormModal open onClose={() => {}} />)

    await user.type(screen.getByLabelText(/^Name/), 'Crude Oil')
    await user.selectOptions(screen.getByLabelText(/^Type/), 'ENERGY')
    await user.selectOptions(screen.getByLabelText(/^Unit of measurement/), 'BARREL')

    submitForm()

    expect(await screen.findByText('Name already exists')).toBeInTheDocument()
    expect(
      screen.getByText('A commodity with this name already exists'),
    ).toBeInTheDocument()
    expect(screen.getByText('Request failed (409)')).toBeInTheDocument()
  })

  it('disables the submit button while the request is in flight', async () => {
    let resolveRequest
    createCommodity.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve
        }),
    )

    const user = userEvent.setup()
    render(<CommodityFormModal open onClose={() => {}} />)

    await user.type(screen.getByLabelText(/^Name/), 'Crude Oil')
    await user.selectOptions(screen.getByLabelText(/^Type/), 'ENERGY')
    await user.selectOptions(screen.getByLabelText(/^Unit of measurement/), 'BARREL')

    submitForm()

    const savingButton = await screen.findByRole('button', { name: 'Saving…' })
    expect(savingButton).toBeDisabled()

    await act(async () => {
      resolveRequest({ id: 1, name: 'Crude Oil' })
    })
  })

  it('sends the exact CommodityRequest payload and notifies the parent', async () => {
    createCommodity.mockResolvedValueOnce({
      id: 7,
      name: 'Crude Oil',
      type: 'ENERGY',
      unitOfMeasurement: 'BARREL',
      description: 'Light sweet crude',
      active: true,
    })
    const onSaved = vi.fn()

    const user = userEvent.setup()
    render(<CommodityFormModal open onClose={() => {}} onSaved={onSaved} />)

    await user.type(screen.getByLabelText(/^Name/), 'Crude Oil')
    await user.selectOptions(screen.getByLabelText(/^Type/), 'ENERGY')
    await user.selectOptions(screen.getByLabelText(/^Unit of measurement/), 'BARREL')
    await user.type(screen.getByLabelText(/^Description/), 'Light sweet crude')

    submitForm()

    await waitFor(() => expect(createCommodity).toHaveBeenCalledTimes(1))
    expect(createCommodity).toHaveBeenCalledWith({
      name: 'Crude Oil',
      type: 'ENERGY',
      unitOfMeasurement: 'BARREL',
      description: 'Light sweet crude',
      active: true,
    })
    expect(updateCommodity).not.toHaveBeenCalled()
    await waitFor(() =>
      expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: 7 })),
    )
  })

  it('calls updateCommodity when editing an existing commodity', async () => {
    updateCommodity.mockResolvedValueOnce({ id: 3, name: 'Copper' })
    const onSaved = vi.fn()

    const user = userEvent.setup()
    render(
      <CommodityFormModal
        open
        onClose={() => {}}
        onSaved={onSaved}
        commodity={{
          id: 3,
          name: 'Copper',
          type: 'METALS',
          unitOfMeasurement: 'METRIC_TON',
          description: '',
          active: true,
        }}
      />,
    )

    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
    await user.clear(screen.getByLabelText(/^Name/))
    await user.type(screen.getByLabelText(/^Name/), 'Refined Copper')

    submitForm()

    await waitFor(() => expect(updateCommodity).toHaveBeenCalledTimes(1))
    expect(updateCommodity).toHaveBeenCalledWith(3, {
      name: 'Refined Copper',
      type: 'METALS',
      unitOfMeasurement: 'METRIC_TON',
      description: null,
      active: true,
    })
  })
})
