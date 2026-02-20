import { describe, it, expect } from 'vitest'
import {
  vehicleSchema,
  tripSchema,
  driverSchema,
  maintenanceSchema,
  fuelLogSchema,
  expenseSchema,
  validateData
} from './validation.js'

describe('Validation Schemas', () => {
  describe('vehicleSchema', () => {
    it('should validate correct vehicle data', () => {
      const validVehicle = {
        name: 'Delivery Van 1',
        model: 'Ford Transit',
        licensePlate: 'ABC-123',
        type: 'VAN',
        maxLoadCapacity: 1000,
        odometer: 50000
      }

      const result = validateData(vehicleSchema, validVehicle)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validVehicle)
    })

    it('should reject vehicle with negative odometer', () => {
      const invalidVehicle = {
        name: 'Delivery Van 1',
        model: 'Ford Transit',
        licensePlate: 'ABC-123',
        type: 'VAN',
        maxLoadCapacity: 1000,
        odometer: -100
      }

      const result = validateData(vehicleSchema, invalidVehicle)
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors.some(e => e.message.includes('non-negative'))).toBe(true)
    })

    it('should reject vehicle with zero or negative capacity', () => {
      const invalidVehicle = {
        name: 'Delivery Van 1',
        model: 'Ford Transit',
        licensePlate: 'ABC-123',
        type: 'VAN',
        maxLoadCapacity: 0,
        odometer: 50000
      }

      const result = validateData(vehicleSchema, invalidVehicle)
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors.some(e => e.message.includes('positive'))).toBe(true)
    })
  })

  describe('tripSchema', () => {
    it('should validate correct trip data', () => {
      const validTrip = {
        vehicleId: 'clx1234567890abcdefgh',
        driverId: 'clx0987654321zyxwvuts',
        cargoWeight: 500,
        cargoDescription: 'Electronics',
        origin: 'Warehouse A',
        destination: 'Store B'
      }

      const result = validateData(tripSchema, validTrip)
      expect(result.success).toBe(true)
    })

    it('should reject trip with negative cargo weight', () => {
      const invalidTrip = {
        vehicleId: 'clx1234567890abcdefgh',
        driverId: 'clx0987654321zyxwvuts',
        cargoWeight: -10,
        origin: 'Warehouse A',
        destination: 'Store B'
      }

      const result = validateData(tripSchema, invalidTrip)
      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.message.includes('positive'))).toBe(true)
    })

    it('should reject trip with missing origin', () => {
      const invalidTrip = {
        vehicleId: 'clx1234567890abcdefgh',
        driverId: 'clx0987654321zyxwvuts',
        cargoWeight: 500,
        origin: '',
        destination: 'Store B'
      }

      const result = validateData(tripSchema, invalidTrip)
      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.field === 'origin')).toBe(true)
    })
  })

  describe('driverSchema', () => {
    it('should validate correct driver data', () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 2)

      const validDriver = {
        userId: 'clx1234567890abcdefgh',
        firstName: 'John',
        lastName: 'Doe',
        licenseNumber: 'DL123456',
        licenseCategory: 'B',
        licenseExpiry: futureDate
      }

      const result = validateData(driverSchema, validDriver)
      expect(result.success).toBe(true)
    })

    it('should reject driver with expired license', () => {
      const pastDate = new Date()
      pastDate.setFullYear(pastDate.getFullYear() - 1)

      const invalidDriver = {
        userId: 'clx1234567890abcdefgh',
        firstName: 'John',
        lastName: 'Doe',
        licenseNumber: 'DL123456',
        licenseCategory: 'B',
        licenseExpiry: pastDate
      }

      const result = validateData(driverSchema, invalidDriver)
      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.message.includes('future'))).toBe(true)
    })
  })

  describe('maintenanceSchema', () => {
    it('should validate correct maintenance data', () => {
      const validMaintenance = {
        vehicleId: 'clx1234567890abcdefgh',
        serviceType: 'Oil Change',
        description: 'Regular maintenance',
        cost: 150.50,
        odometer: 75000,
        serviceDate: new Date()
      }

      const result = validateData(maintenanceSchema, validMaintenance)
      expect(result.success).toBe(true)
    })

    it('should reject maintenance with negative cost', () => {
      const invalidMaintenance = {
        vehicleId: 'clx1234567890abcdefgh',
        serviceType: 'Oil Change',
        cost: -50,
        odometer: 75000,
        serviceDate: new Date()
      }

      const result = validateData(maintenanceSchema, invalidMaintenance)
      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.message.includes('positive'))).toBe(true)
    })

    it('should reject maintenance with zero cost', () => {
      const invalidMaintenance = {
        vehicleId: 'clx1234567890abcdefgh',
        serviceType: 'Oil Change',
        cost: 0,
        odometer: 75000,
        serviceDate: new Date()
      }

      const result = validateData(maintenanceSchema, invalidMaintenance)
      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.message.includes('positive'))).toBe(true)
    })
  })

  describe('fuelLogSchema', () => {
    it('should validate correct fuel log data', () => {
      const validFuelLog = {
        vehicleId: 'clx1234567890abcdefgh',
        liters: 50,
        cost: 75.50,
        pricePerLiter: 1.51,
        odometer: 80000,
        fuelDate: new Date()
      }

      const result = validateData(fuelLogSchema, validFuelLog)
      expect(result.success).toBe(true)
    })

    it('should reject fuel log with negative liters', () => {
      const invalidFuelLog = {
        vehicleId: 'clx1234567890abcdefgh',
        liters: -10,
        cost: 75.50,
        pricePerLiter: 1.51,
        odometer: 80000,
        fuelDate: new Date()
      }

      const result = validateData(fuelLogSchema, invalidFuelLog)
      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.message.includes('positive'))).toBe(true)
    })

    it('should reject fuel log with zero cost', () => {
      const invalidFuelLog = {
        vehicleId: 'clx1234567890abcdefgh',
        liters: 50,
        cost: 0,
        pricePerLiter: 1.51,
        odometer: 80000,
        fuelDate: new Date()
      }

      const result = validateData(fuelLogSchema, invalidFuelLog)
      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.message.includes('positive'))).toBe(true)
    })
  })

  describe('expenseSchema', () => {
    it('should validate expense with vehicleId', () => {
      const validExpense = {
        vehicleId: 'clx1234567890abcdefgh',
        category: 'Repair',
        description: 'Tire replacement',
        amount: 200,
        expenseDate: new Date()
      }

      const result = validateData(expenseSchema, validExpense)
      expect(result.success).toBe(true)
    })

    it('should validate expense with tripId', () => {
      const validExpense = {
        tripId: 'clx1234567890abcdefgh',
        category: 'Toll',
        amount: 15,
        expenseDate: new Date()
      }

      const result = validateData(expenseSchema, validExpense)
      expect(result.success).toBe(true)
    })

    it('should reject expense without vehicleId or tripId', () => {
      const invalidExpense = {
        category: 'Repair',
        amount: 200,
        expenseDate: new Date()
      }

      const result = validateData(expenseSchema, invalidExpense)
      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.message.includes('vehicleId or tripId'))).toBe(true)
    })

    it('should reject expense with negative amount', () => {
      const invalidExpense = {
        vehicleId: 'clx1234567890abcdefgh',
        category: 'Repair',
        amount: -50,
        expenseDate: new Date()
      }

      const result = validateData(expenseSchema, invalidExpense)
      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.message.includes('positive'))).toBe(true)
    })
  })
})
