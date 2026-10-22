import React, { useEffect, useMemo, useState } from 'react'
import Modal from '../Modal'
import Field, { FormErrorBanner, buildCommodityOptions, buildReferenceOptions } from './Field'
import { createContract, updateContract } from '../../services/contracts'
import { listCommodities } from '../../services/commodities'
import { listTrades } from '../../services/trades'
import { useAsync } from '../../hooks/useAsync'
import { normalizeError } from '../../services/api'
import { CONTRACT_STATUS_OPTIONS } from '../../utils/constants'
import { validateContract } from '../../utils/validation'
import { formatCurrency, todayIso } from '../../utils/format'

function emptyValues() {
  return {
    contractReference: '',
    buyerName: '',
    sellerName: '',
    commodityId: '',
    contractQuantity: '',
    contractPrice: '',
    contractDate: todayIso(),
    deliveryDate: '',
    deliveryLocation: '',
    status: 'DRAFT',
    linkedTradeId: '',
  }
}

function toFormValues(contract) {
  if (!contract) return emptyValues()
  return {
    contractReference: contract.contractReference || '',
    buyerName: contract.buyerName || '',
    sellerName: contract.sellerName || '',
    commodityId: contract.commodityId != null ? String(contract.commodityId) : '',
    contractQuantity:
      contract.contractQuantity != null ? String(contract.contractQuantity) : '',
    contractPrice: contract.contractPrice != null ? String(contract.contractPrice) : '',
    contractDate: contract.contractDate || todayIso(),
    deliveryDate: contract.deliveryDate || '',
    deliveryLocation: contract.deliveryLocation || '',
    status: contract.status || 'DRAFT',
    linkedTradeId: contract.linkedTradeId != null ? String(contract.linkedTradeId) : '',
  }
}

/** Create / edit dialog for a contract. */
export function ContractFormModal({ open, contract = null, onClose, onSaved }) {
  const isEdit = Boolean(contract?.id)
  const [values, setValues] = useState(() => toFormValues(contract))
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [saving, setSaving] = useState(false)

  const commoditiesQuery = useAsync(() => listCommodities({ active: true }), [open], {
    immediate: open,
    initialData: [],
  })
  const tradesQuery = useAsync(() => listTrades({ page: 0, size: 100, sort: 'tradeDate,desc' }), [open], {
    immediate: open,
    initialData: null,
  })

  const commodities = commoditiesQuery.data || []
  const trades = tradesQuery.data?.content || []

  const commodityOptions = useMemo(
    () => buildCommodityOptions(commodities),
    [commodities],
  )
  const tradeOptions = useMemo(
    () => buildReferenceOptions(trades, 'id', 'tradeReference'),
    [trades],
  )

  useEffect(() => {
    if (open) {
      setValues(toFormValues(contract))
      setErrors({})
      setSubmitError(null)
      setSaving(false)
    }
  }, [open, contract])

  const contractValue =
    Number(values.contractQuantity) > 0 && Number(values.contractPrice) > 0
      ? Number(values.contractQuantity) * Number(values.contractPrice)
      : null

  function setValue(field, value) {
    setValues((prev) => {
      const next = { ...prev, [field]: value }
      // Keep the delivery-date rule responsive as the user types.
      if (field === 'contractDate' && next.deliveryDate && next.deliveryDate < value) {
        next.deliveryDate = value
      }
      return next
    })
    setErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const clientErrors = validateContract(values)
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      setSubmitError(null)
      return
    }

    const payload = {
      contractReference: values.contractReference.trim(),
      buyerName: values.buyerName.trim(),
      sellerName: values.sellerName.trim(),
      commodityId: Number(values.commodityId),
      contractQuantity: Number(values.contractQuantity),
      contractPrice: Number(values.contractPrice),
      contractDate: values.contractDate,
      deliveryDate: values.deliveryDate,
      deliveryLocation: values.deliveryLocation.trim(),
      status: values.status,
      linkedTradeId: values.linkedTradeId ? Number(values.linkedTradeId) : null,
    }

    setSaving(true)
    setSubmitError(null)
    try {
      const saved = isEdit
        ? await updateContract(contract.id, payload)
        : await createContract(payload)
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

  const optionsLoading = commoditiesQuery.loading || tradesQuery.loading

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Edit contract' : 'New contract'}
      subtitle={
        isEdit
          ? `Update contract ${contract?.contractReference || `#${contract?.id}`}.`
          : 'Create a contract and schedule its delivery.'
      }
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="submit"
            form="contract-form"
            className="btn btn--primary"
            disabled={saving || optionsLoading}
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create contract'}
          </button>
        </>
      }
    >
      <FormErrorBanner error={submitError} />

      <form id="contract-form" onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          <Field
            label="Contract reference"
            htmlFor="contract-reference"
            error={errors.contractReference}
            hint="Optional — generated by the backend when blank."
          >
            <input
              id="contract-reference"
              className="input mono"
              type="text"
              value={values.contractReference}
              onChange={(event) => setValue('contractReference', event.target.value)}
              aria-invalid={Boolean(errors.contractReference)}
              placeholder="CTR-2026-0001"
              autoComplete="off"
            />
          </Field>

          <Field label="Status" htmlFor="contract-status" required error={errors.status}>
            <select
              id="contract-status"
              className="select"
              value={values.status}
              onChange={(event) => setValue('status', event.target.value)}
              aria-invalid={Boolean(errors.status)}
            >
              {CONTRACT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Buyer name" htmlFor="contract-buyer" required error={errors.buyerName}>
            <input
              id="contract-buyer"
              className="input"
              type="text"
              value={values.buyerName}
              onChange={(event) => setValue('buyerName', event.target.value)}
              aria-invalid={Boolean(errors.buyerName)}
              placeholder="Vitol"
              autoComplete="off"
            />
          </Field>

          <Field
            label="Seller name"
            htmlFor="contract-seller"
            required
            error={errors.sellerName}
          >
            <input
              id="contract-seller"
              className="input"
              type="text"
              value={values.sellerName}
              onChange={(event) => setValue('sellerName', event.target.value)}
              aria-invalid={Boolean(errors.sellerName)}
              placeholder="Trafigura"
              autoComplete="off"
            />
          </Field>

          <Field
            label="Commodity"
            htmlFor="contract-commodity"
            required
            error={errors.commodityId}
          >
            <select
              id="contract-commodity"
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

          <Field
            label="Contract quantity"
            htmlFor="contract-quantity"
            required
            error={errors.contractQuantity}
          >
            <input
              id="contract-quantity"
              className="input"
              type="number"
              min="0"
              step="0.0001"
              value={values.contractQuantity}
              onChange={(event) => setValue('contractQuantity', event.target.value)}
              aria-invalid={Boolean(errors.contractQuantity)}
              placeholder="5000"
            />
          </Field>

          <Field
            label="Contract price (USD)"
            htmlFor="contract-price"
            required
            error={errors.contractPrice}
          >
            <input
              id="contract-price"
              className="input"
              type="number"
              min="0"
              step="0.0001"
              value={values.contractPrice}
              onChange={(event) => setValue('contractPrice', event.target.value)}
              aria-invalid={Boolean(errors.contractPrice)}
              placeholder="76.25"
            />
          </Field>

          <Field
            label="Contract date"
            htmlFor="contract-date"
            required
            error={errors.contractDate}
          >
            <input
              id="contract-date"
              className="input"
              type="date"
              value={values.contractDate}
              onChange={(event) => setValue('contractDate', event.target.value)}
              aria-invalid={Boolean(errors.contractDate)}
            />
          </Field>

          <Field
            label="Delivery date"
            htmlFor="contract-delivery"
            required
            error={errors.deliveryDate}
            hint="Must be on or after the contract date."
          >
            <input
              id="contract-delivery"
              className="input"
              type="date"
              value={values.deliveryDate}
              min={values.contractDate || undefined}
              onChange={(event) => setValue('deliveryDate', event.target.value)}
              aria-invalid={Boolean(errors.deliveryDate)}
            />
          </Field>

          <Field
            label="Delivery location"
            htmlFor="contract-location"
            required
            error={errors.deliveryLocation}
          >
            <input
              id="contract-location"
              className="input"
              type="text"
              value={values.deliveryLocation}
              onChange={(event) => setValue('deliveryLocation', event.target.value)}
              aria-invalid={Boolean(errors.deliveryLocation)}
              placeholder="Rotterdam"
              autoComplete="off"
            />
          </Field>

          <Field
            label="Linked trade"
            htmlFor="contract-trade"
            error={errors.linkedTradeId}
            hint="Optional — load trades from the ledger."
            full
          >
            <select
              id="contract-trade"
              className="select"
              value={values.linkedTradeId}
              onChange={(event) => setValue('linkedTradeId', event.target.value)}
              aria-invalid={Boolean(errors.linkedTradeId)}
              disabled={optionsLoading}
            >
              <option value="">None</option>
              {tradeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="field field--full">
            <span className="field__label">Contract value (quantity × price)</span>
            <span className="row" style={{ minHeight: 34 }}>
              <strong className="num">
                {contractValue === null ? '-' : formatCurrency(contractValue)}
              </strong>
              <span className="text-subtle text-xs">
                Calculated preview — the backend computes the authoritative value.
              </span>
            </span>
          </div>
        </div>
      </form>
    </Modal>
  )
}

export default ContractFormModal
