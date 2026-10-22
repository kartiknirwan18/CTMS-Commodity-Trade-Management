import React, { useEffect, useMemo, useState } from 'react'
import Modal from '../Modal'
import Field, { FormErrorBanner, buildCommodityOptions, buildReferenceOptions } from './Field'
import { createTrade, updateTrade } from '../../services/trades'
import { listCommodities } from '../../services/commodities'
import { listContracts } from '../../services/contracts'
import { useAsync } from '../../hooks/useAsync'
import { normalizeError } from '../../services/api'
import { TRADE_STATUS_OPTIONS, TRADE_TYPE_OPTIONS } from '../../utils/constants'
import { validateTrade } from '../../utils/validation'
import { formatCurrency, formatDateTime, todayIso } from '../../utils/format'

function emptyValues() {
  return {
    tradeReference: '',
    commodityId: '',
    tradeType: 'BUY',
    quantity: '',
    pricePerUnit: '',
    tradeDate: todayIso(),
    counterparty: '',
    contractId: '',
    status: 'DRAFT',
  }
}

function toFormValues(trade) {
  if (!trade) return emptyValues()
  return {
    tradeReference: trade.tradeReference || '',
    commodityId: trade.commodityId != null ? String(trade.commodityId) : '',
    tradeType: trade.tradeType || 'BUY',
    quantity: trade.quantity != null ? String(trade.quantity) : '',
    pricePerUnit: trade.pricePerUnit != null ? String(trade.pricePerUnit) : '',
    tradeDate: trade.tradeDate || todayIso(),
    counterparty: trade.counterparty || '',
    contractId: trade.contractId != null ? String(trade.contractId) : '',
    status: trade.status || 'DRAFT',
  }
}

/** Create / edit dialog for a trade. */
export function TradeFormModal({ open, trade = null, onClose, onSaved }) {
  const isEdit = Boolean(trade?.id)
  const [values, setValues] = useState(() => toFormValues(trade))
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [saving, setSaving] = useState(false)

  // Options are loaded from the API — never hardcoded.
  const commoditiesQuery = useAsync(
    () => listCommodities({ active: true }),
    [open],
    { immediate: open, initialData: [] },
  )
  const contractsQuery = useAsync(
    () => listContracts({ page: 0, size: 100, sort: 'contractDate,desc' }),
    [open],
    { immediate: open, initialData: null },
  )

  const commodities = commoditiesQuery.data || []
  const contracts = contractsQuery.data?.content || []

  const commodityOptions = useMemo(
    () => buildCommodityOptions(commodities),
    [commodities],
  )
  const contractOptions = useMemo(
    () => buildReferenceOptions(contracts, 'id', 'contractReference'),
    [contracts],
  )

  useEffect(() => {
    if (open) {
      setValues(toFormValues(trade))
      setErrors({})
      setSubmitError(null)
      setSaving(false)
    }
  }, [open, trade])

  const selectedCommodity = commodities.find(
    (item) => String(item.id) === String(values.commodityId),
  )

  const totalValue =
    Number(values.quantity) > 0 && Number(values.pricePerUnit) > 0
      ? Number(values.quantity) * Number(values.pricePerUnit)
      : null

  function setValue(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const clientErrors = validateTrade(values)
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      setSubmitError(null)
      return
    }

    const payload = {
      tradeReference: values.tradeReference.trim(),
      commodityId: Number(values.commodityId),
      tradeType: values.tradeType,
      quantity: Number(values.quantity),
      pricePerUnit: Number(values.pricePerUnit),
      tradeDate: values.tradeDate,
      counterparty: values.counterparty.trim(),
      contractId: values.contractId ? Number(values.contractId) : null,
      status: values.status,
    }

    setSaving(true)
    setSubmitError(null)
    try {
      const saved = isEdit ? await updateTrade(trade.id, payload) : await createTrade(payload)
      setSaving(false)
      onSaved?.(saved)
    } catch (error) {
      const normalized = normalizeError(error)
      setSaving(false)
      setSubmitError(normalized)
      if (normalized.fieldErrors?.length) {
        setErrors((prev) => ({ ...prev, ...normalized.fieldErrorMap }))
      }
    }
  }

  const optionsLoading = commoditiesQuery.loading || contractsQuery.loading

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Edit trade' : 'New trade'}
      subtitle={
        isEdit
          ? `Update trade ${trade?.tradeReference || `#${trade?.id}`}.`
          : 'Record a buy or sell trade. Leave the reference blank to auto-generate it.'
      }
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="submit"
            form="trade-form"
            className="btn btn--primary"
            disabled={saving || optionsLoading}
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create trade'}
          </button>
        </>
      }
    >
      <FormErrorBanner error={submitError} />

      {commoditiesQuery.error ? (
        <div className="alert alert--warning modal__error" role="status">
          <span className="alert__icon" aria-hidden="true">
            ⚠
          </span>
          <div className="alert__body">
            Commodity list could not be loaded: {commoditiesQuery.error.message}
          </div>
        </div>
      ) : null}

      <form id="trade-form" onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          <Field
            label="Trade reference"
            htmlFor="trade-reference"
            error={errors.tradeReference}
            hint="Optional — generated by the backend when blank."
          >
            <input
              id="trade-reference"
              className="input mono"
              type="text"
              value={values.tradeReference}
              onChange={(event) => setValue('tradeReference', event.target.value)}
              aria-invalid={Boolean(errors.tradeReference)}
              placeholder="TRD-2026-0001"
              autoComplete="off"
            />
          </Field>

          <Field
            label="Commodity"
            htmlFor="trade-commodity"
            required
            error={errors.commodityId}
          >
            <select
              id="trade-commodity"
              className="select"
              value={values.commodityId}
              onChange={(event) => setValue('commodityId', event.target.value)}
              aria-invalid={Boolean(errors.commodityId)}
              disabled={optionsLoading}
            >
              <option value="">{optionsLoading ? 'Loading…' : 'Select a commodity…'}</option>
              {commodityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Trade type" htmlFor="trade-type" required error={errors.tradeType}>
            <select
              id="trade-type"
              className="select"
              value={values.tradeType}
              onChange={(event) => setValue('tradeType', event.target.value)}
              aria-invalid={Boolean(errors.tradeType)}
            >
              {TRADE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Status" htmlFor="trade-status" required error={errors.status}>
            <select
              id="trade-status"
              className="select"
              value={values.status}
              onChange={(event) => setValue('status', event.target.value)}
              aria-invalid={Boolean(errors.status)}
            >
              {TRADE_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Quantity"
            htmlFor="trade-quantity"
            required
            error={errors.quantity}
            hint={selectedCommodity ? `Unit: ${selectedCommodity.unitOfMeasurement}` : undefined}
          >
            <input
              id="trade-quantity"
              className="input"
              type="number"
              min="0"
              step="0.0001"
              value={values.quantity}
              onChange={(event) => setValue('quantity', event.target.value)}
              aria-invalid={Boolean(errors.quantity)}
              placeholder="1000"
            />
          </Field>

          <Field
            label="Price per unit (USD)"
            htmlFor="trade-price"
            required
            error={errors.pricePerUnit}
          >
            <input
              id="trade-price"
              className="input"
              type="number"
              min="0"
              step="0.0001"
              value={values.pricePerUnit}
              onChange={(event) => setValue('pricePerUnit', event.target.value)}
              aria-invalid={Boolean(errors.pricePerUnit)}
              placeholder="78.50"
            />
          </Field>

          <Field label="Trade date" htmlFor="trade-date" required error={errors.tradeDate}>
            <input
              id="trade-date"
              className="input"
              type="date"
              value={values.tradeDate}
              onChange={(event) => setValue('tradeDate', event.target.value)}
              aria-invalid={Boolean(errors.tradeDate)}
            />
          </Field>

          <Field
            label="Counterparty"
            htmlFor="trade-counterparty"
            required
            error={errors.counterparty}
          >
            <input
              id="trade-counterparty"
              className="input"
              type="text"
              value={values.counterparty}
              onChange={(event) => setValue('counterparty', event.target.value)}
              aria-invalid={Boolean(errors.counterparty)}
              placeholder="Glencore"
              autoComplete="off"
            />
          </Field>

          <Field
            label="Linked contract"
            htmlFor="trade-contract"
            error={errors.contractId}
            hint="Optional — attach this trade to an existing contract."
            full
          >
            <select
              id="trade-contract"
              className="select"
              value={values.contractId}
              onChange={(event) => setValue('contractId', event.target.value)}
              aria-invalid={Boolean(errors.contractId)}
              disabled={optionsLoading}
            >
              <option value="">None</option>
              {contractOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="field field--full">
            <span className="field__label">Total value (quantity × price)</span>
            <span className="row" style={{ minHeight: 34 }}>
              <strong className="num">
                {totalValue === null ? '-' : formatCurrency(totalValue)}
              </strong>
              <span className="text-subtle text-xs">
                Calculated preview — the backend computes the authoritative value.
              </span>
            </span>
          </div>

          {isEdit && trade?.updatedAt ? (
            <div className="field field--full">
              <span className="field__hint">
                Last updated {formatDateTime(trade.updatedAt)}
              </span>
            </div>
          ) : null}
        </div>
      </form>
    </Modal>
  )
}

export default TradeFormModal
