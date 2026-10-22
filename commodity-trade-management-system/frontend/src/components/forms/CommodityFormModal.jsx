import React, { useEffect, useState } from 'react'
import Modal from '../Modal'
import Field, { FormErrorBanner } from './Field'
import { createCommodity, updateCommodity } from '../../services/commodities'
import { COMMODITY_TYPE_OPTIONS, UNIT_OF_MEASUREMENT_OPTIONS } from '../../utils/constants'
import { validateCommodity } from '../../utils/validation'
import { normalizeError } from '../../services/api'

const EMPTY_VALUES = {
  name: '',
  type: '',
  unitOfMeasurement: '',
  description: '',
  active: true,
}

function toFormValues(commodity) {
  if (!commodity) return { ...EMPTY_VALUES }
  return {
    name: commodity.name || '',
    type: commodity.type || '',
    unitOfMeasurement: commodity.unitOfMeasurement || '',
    description: commodity.description || '',
    active: commodity.active !== false,
  }
}

/**
 * Create / edit dialog for a commodity.
 * Shows inline validation, disables submit while saving and surfaces
 * backend 400/409 messages (including per-field errors).
 */
export function CommodityFormModal({ open, commodity = null, onClose, onSaved }) {
  const isEdit = Boolean(commodity?.id)
  const [values, setValues] = useState(() => toFormValues(commodity))
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setValues(toFormValues(commodity))
      setErrors({})
      setSubmitError(null)
      setSaving(false)
    }
  }, [open, commodity])

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
    const clientErrors = validateCommodity(values)
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      setSubmitError(null)
      return
    }

    const payload = {
      name: values.name.trim(),
      type: values.type,
      unitOfMeasurement: values.unitOfMeasurement,
      description: values.description?.trim() ? values.description.trim() : null,
      active: Boolean(values.active),
    }

    setSaving(true)
    setSubmitError(null)
    try {
      const saved = isEdit
        ? await updateCommodity(commodity.id, payload)
        : await createCommodity(payload)
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit commodity' : 'New commodity'}
      subtitle={
        isEdit
          ? `Update the reference data for "${commodity?.name}".`
          : 'Add a commodity that can be traded.'
      }
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="submit"
            form="commodity-form"
            className="btn btn--primary"
            disabled={saving}
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create commodity'}
          </button>
        </>
      }
    >
      <FormErrorBanner error={submitError} />

      <form id="commodity-form" onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          <Field
            label="Name"
            htmlFor="commodity-name"
            required
            error={errors.name}
            full
          >
            <input
              id="commodity-name"
              className="input"
              type="text"
              value={values.name}
              onChange={(event) => setValue('name', event.target.value)}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'commodity-name-error' : undefined}
              placeholder="e.g. Crude Oil"
              autoComplete="off"
            />
          </Field>

          <Field label="Type" htmlFor="commodity-type" required error={errors.type}>
            <select
              id="commodity-type"
              className="select"
              value={values.type}
              onChange={(event) => setValue('type', event.target.value)}
              aria-invalid={Boolean(errors.type)}
              aria-describedby={errors.type ? 'commodity-type-error' : undefined}
            >
              <option value="">Select a type…</option>
              {COMMODITY_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Unit of measurement"
            htmlFor="commodity-unit"
            required
            error={errors.unitOfMeasurement}
          >
            <select
              id="commodity-unit"
              className="select"
              value={values.unitOfMeasurement}
              onChange={(event) => setValue('unitOfMeasurement', event.target.value)}
              aria-invalid={Boolean(errors.unitOfMeasurement)}
              aria-describedby={
                errors.unitOfMeasurement ? 'commodity-unit-error' : undefined
              }
            >
              <option value="">Select a unit…</option>
              {UNIT_OF_MEASUREMENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Description"
            htmlFor="commodity-description"
            error={errors.description}
            hint="Optional. Max 500 characters."
            full
          >
            <textarea
              id="commodity-description"
              className="textarea"
              value={values.description}
              onChange={(event) => setValue('description', event.target.value)}
              aria-invalid={Boolean(errors.description)}
              aria-describedby={
                errors.description ? 'commodity-description-error' : undefined
              }
              placeholder="Short description of the commodity"
            />
          </Field>

          <div className="field field--full">
            <label className="checkbox-field" htmlFor="commodity-active">
              <input
                id="commodity-active"
                type="checkbox"
                checked={Boolean(values.active)}
                onChange={(event) => setValue('active', event.target.checked)}
              />
              Active — available for new trades and contracts
            </label>
          </div>
        </div>
      </form>
    </Modal>
  )
}

export default CommodityFormModal
