/**
 * Client-side form validators.
 * Each validator returns an object of { fieldName: message }.
 * An empty object means the form is valid.
 */

const NAME_MAX = 120
const DESCRIPTION_MAX = 500
const REFERENCE_MAX = 64
const LOCATION_MAX = 160

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === ''
}

function asNumber(value) {
  if (value === null || value === undefined || value === '') return NaN
  return Number(value)
}

export function validateCommodity(values = {}) {
  const errors = {}

  if (isBlank(values.name)) {
    errors.name = 'Name is required'
  } else if (String(values.name).trim().length > NAME_MAX) {
    errors.name = `Name must be at most ${NAME_MAX} characters`
  }

  if (isBlank(values.type)) {
    errors.type = 'Commodity type is required'
  }

  if (isBlank(values.unitOfMeasurement)) {
    errors.unitOfMeasurement = 'Unit of measurement is required'
  }

  if (values.description && String(values.description).length > DESCRIPTION_MAX) {
    errors.description = `Description must be at most ${DESCRIPTION_MAX} characters`
  }

  return errors
}

export function validateTrade(values = {}) {
  const errors = {}

  if (values.tradeReference && String(values.tradeReference).length > REFERENCE_MAX) {
    errors.tradeReference = `Reference must be at most ${REFERENCE_MAX} characters`
  }

  const commodityId = asNumber(values.commodityId)
  if (!Number.isFinite(commodityId) || commodityId <= 0) {
    errors.commodityId = 'Commodity is required'
  }

  if (isBlank(values.tradeType)) {
    errors.tradeType = 'Trade type is required'
  }

  const quantity = asNumber(values.quantity)
  if (!Number.isFinite(quantity)) {
    errors.quantity = 'Quantity is required'
  } else if (quantity <= 0) {
    errors.quantity = 'Quantity must be greater than zero'
  }

  const price = asNumber(values.pricePerUnit)
  if (!Number.isFinite(price)) {
    errors.pricePerUnit = 'Price per unit is required'
  } else if (price <= 0) {
    errors.pricePerUnit = 'Price per unit must be greater than zero'
  }

  if (isBlank(values.tradeDate)) {
    errors.tradeDate = 'Trade date is required'
  }

  if (isBlank(values.counterparty)) {
    errors.counterparty = 'Counterparty is required'
  } else if (String(values.counterparty).length > NAME_MAX) {
    errors.counterparty = `Counterparty must be at most ${NAME_MAX} characters`
  }

  if (isBlank(values.status)) {
    errors.status = 'Status is required'
  }

  return errors
}

export function validateContract(values = {}) {
  const errors = {}

  if (
    values.contractReference &&
    String(values.contractReference).length > REFERENCE_MAX
  ) {
    errors.contractReference = `Reference must be at most ${REFERENCE_MAX} characters`
  }

  if (isBlank(values.buyerName)) {
    errors.buyerName = 'Buyer name is required'
  } else if (String(values.buyerName).length > NAME_MAX) {
    errors.buyerName = `Buyer name must be at most ${NAME_MAX} characters`
  }

  if (isBlank(values.sellerName)) {
    errors.sellerName = 'Seller name is required'
  } else if (String(values.sellerName).length > NAME_MAX) {
    errors.sellerName = `Seller name must be at most ${NAME_MAX} characters`
  }

  const commodityId = asNumber(values.commodityId)
  if (!Number.isFinite(commodityId) || commodityId <= 0) {
    errors.commodityId = 'Commodity is required'
  }

  const contractQuantity = asNumber(values.contractQuantity)
  if (!Number.isFinite(contractQuantity)) {
    errors.contractQuantity = 'Contract quantity is required'
  } else if (contractQuantity <= 0) {
    errors.contractQuantity = 'Contract quantity must be greater than zero'
  }

  const contractPrice = asNumber(values.contractPrice)
  if (!Number.isFinite(contractPrice)) {
    errors.contractPrice = 'Contract price is required'
  } else if (contractPrice <= 0) {
    errors.contractPrice = 'Contract price must be greater than zero'
  }

  if (isBlank(values.contractDate)) {
    errors.contractDate = 'Contract date is required'
  }

  if (isBlank(values.deliveryDate)) {
    errors.deliveryDate = 'Delivery date is required'
  } else if (
    !isBlank(values.contractDate) &&
    String(values.deliveryDate) < String(values.contractDate)
  ) {
    errors.deliveryDate = 'Delivery date must be on or after the contract date'
  }

  if (isBlank(values.deliveryLocation)) {
    errors.deliveryLocation = 'Delivery location is required'
  } else if (String(values.deliveryLocation).length > LOCATION_MAX) {
    errors.deliveryLocation = `Delivery location must be at most ${LOCATION_MAX} characters`
  }

  if (isBlank(values.status)) {
    errors.status = 'Status is required'
  }

  return errors
}

/** True when a validator result has no error keys. */
export function isValid(errors) {
  return !errors || Object.keys(errors).length === 0
}
