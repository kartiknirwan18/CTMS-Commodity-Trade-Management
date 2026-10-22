import { describe, expect, it } from 'vitest'
import { isValid, validateCommodity, validateContract, validateTrade } from '../utils/validation'

const VALID_COMMODITY = {
  name: 'Crude Oil',
  type: 'ENERGY',
  unitOfMeasurement: 'BARREL',
  description: 'Light sweet crude',
  active: true,
}

const VALID_TRADE = {
  tradeReference: '',
  commodityId: '1',
  tradeType: 'BUY',
  quantity: '1000',
  pricePerUnit: '78.5',
  tradeDate: '2026-10-01',
  counterparty: 'Glencore',
  contractId: '',
  status: 'DRAFT',
}

const VALID_CONTRACT = {
  contractReference: '',
  buyerName: 'Vitol',
  sellerName: 'Trafigura',
  commodityId: '1',
  contractQuantity: '5000',
  contractPrice: '76.25',
  contractDate: '2026-09-01',
  deliveryDate: '2026-10-15',
  deliveryLocation: 'Rotterdam',
  status: 'DRAFT',
  linkedTradeId: '',
}

describe('validateCommodity', () => {
  it('accepts a complete payload', () => {
    expect(validateCommodity(VALID_COMMODITY)).toEqual({})
    expect(isValid(validateCommodity(VALID_COMMODITY))).toBe(true)
  })

  it('requires name, type and unit of measurement', () => {
    const errors = validateCommodity({})
    expect(errors.name).toBe('Name is required')
    expect(errors.type).toBe('Commodity type is required')
    expect(errors.unitOfMeasurement).toBe('Unit of measurement is required')
  })

  it('treats whitespace-only names as missing', () => {
    const errors = validateCommodity({ ...VALID_COMMODITY, name: '   ' })
    expect(errors.name).toBe('Name is required')
  })

  it('enforces a maximum name length', () => {
    const errors = validateCommodity({ ...VALID_COMMODITY, name: 'a'.repeat(121) })
    expect(errors.name).toMatch(/at most 120 characters/)
  })

  it('enforces a maximum description length', () => {
    const errors = validateCommodity({
      ...VALID_COMMODITY,
      description: 'a'.repeat(501),
    })
    expect(errors.description).toMatch(/at most 500 characters/)
  })
})

describe('validateTrade', () => {
  it('accepts a complete payload with an empty (auto-generated) reference', () => {
    expect(validateTrade(VALID_TRADE)).toEqual({})
  })

  it('requires a commodity and a counterparty', () => {
    const errors = validateTrade({})
    expect(errors.commodityId).toBe('Commodity is required')
    expect(errors.counterparty).toBe('Counterparty is required')
  })

  it('requires a quantity greater than zero', () => {
    expect(validateTrade({ ...VALID_TRADE, quantity: '0' }).quantity).toBe(
      'Quantity must be greater than zero',
    )
    expect(validateTrade({ ...VALID_TRADE, quantity: '-5' }).quantity).toBe(
      'Quantity must be greater than zero',
    )
    expect(validateTrade({ ...VALID_TRADE, quantity: 'abc' }).quantity).toBe(
      'Quantity is required',
    )
  })

  it('requires a price per unit greater than zero', () => {
    expect(validateTrade({ ...VALID_TRADE, pricePerUnit: '0' }).pricePerUnit).toBe(
      'Price per unit must be greater than zero',
    )
    expect(validateTrade({ ...VALID_TRADE, pricePerUnit: '' }).pricePerUnit).toBe(
      'Price per unit is required',
    )
  })

  it('requires a trade date and a status', () => {
    const errors = validateTrade({ ...VALID_TRADE, tradeDate: '', status: '' })
    expect(errors.tradeDate).toBe('Trade date is required')
    expect(errors.status).toBe('Status is required')
  })
})

describe('validateContract', () => {
  it('accepts a complete payload', () => {
    expect(validateContract(VALID_CONTRACT)).toEqual({})
  })

  it('requires buyer, seller, location and quantities', () => {
    const errors = validateContract({})
    expect(errors.buyerName).toBe('Buyer name is required')
    expect(errors.sellerName).toBe('Seller name is required')
    expect(errors.contractQuantity).toBe('Contract quantity is required')
    expect(errors.contractPrice).toBe('Contract price is required')
    expect(errors.deliveryLocation).toBe('Delivery location is required')
  })

  it('requires the delivery date to be on or after the contract date', () => {
    const errors = validateContract({
      ...VALID_CONTRACT,
      contractDate: '2026-10-15',
      deliveryDate: '2026-10-01',
    })
    expect(errors.deliveryDate).toBe(
      'Delivery date must be on or after the contract date',
    )
  })

  it('allows the delivery date to equal the contract date', () => {
    const errors = validateContract({
      ...VALID_CONTRACT,
      contractDate: '2026-10-15',
      deliveryDate: '2026-10-15',
    })
    expect(errors.deliveryDate).toBeUndefined()
  })

  it('rejects non-positive contract quantities and prices', () => {
    const errors = validateContract({
      ...VALID_CONTRACT,
      contractQuantity: '0',
      contractPrice: '-1',
    })
    expect(errors.contractQuantity).toBe('Contract quantity must be greater than zero')
    expect(errors.contractPrice).toBe('Contract price must be greater than zero')
  })
})
