import { z } from 'zod'

// Enum definitions matching Prisma schema
export const VehicleType = z.enum(['TRUCK', 'VAN', 'BIKE'])
export const VehicleStatus = z.enum(['AVAILABLE', 'ON_TRIP', 'IN_SHOP', 'OUT_OF_SERVICE'])
export const DriverStatus = z.enum(['ON_DUTY', 'OFF_DUTY', 'SUSPENDED'])
export const TripStatus = z.enum(['DRAFT', 'DISPATCHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ISSUE_REPORTED'])
export const Role = z.enum(['FLEET_MANAGER', 'DISPATCHER', 'DRIVER'])

// Vehicle validation schema
// Validates: Requirements 12.6, 12.8
export const vehicleSchema = z.object({
  name: z.string().min(1, 'Vehicle name is required').max(100, 'Vehicle name must be 100 characters or less'),
  model: z.string().min(1, 'Vehicle model is required').max(100, 'Vehicle model must be 100 characters or less'),
  licensePlate: z.string().min(1, 'License plate is required').max(20, 'License plate must be 20 characters or less'),
  type: VehicleType,
  maxLoadCapacity: z.number().positive('Max load capacity must be a positive number'),
  odometer: z.number().nonnegative('Odometer reading must be non-negative'),
  acquisitionCost: z.number().positive('Acquisition cost must be a positive number').optional(),
  status: VehicleStatus.optional()
})

// Vehicle update schema (allows partial updates)
export const vehicleUpdateSchema = vehicleSchema.partial()

// Trip validation schema
// Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5
export const tripSchema = z.object({
  vehicleId: z.string().cuid('Invalid vehicle ID format'),
  driverId: z.string().cuid('Invalid driver ID format'),
  cargoWeight: z.number().positive('Cargo weight must be a positive number'),
  cargoDescription: z.string().max(500, 'Cargo description must be 500 characters or less').optional(),
  origin: z.string().min(1, 'Origin is required').max(200, 'Origin must be 200 characters or less'),
  destination: z.string().min(1, 'Destination is required').max(200, 'Destination must be 200 characters or less'),
  scheduledStart: z.coerce.date().optional(),
  status: TripStatus.optional()
})

// Trip update schema
export const tripUpdateSchema = z.object({
  cargoWeight: z.number().positive('Cargo weight must be a positive number').optional(),
  cargoDescription: z.string().max(500, 'Cargo description must be 500 characters or less').optional(),
  origin: z.string().min(1, 'Origin is required').max(200, 'Origin must be 200 characters or less').optional(),
  destination: z.string().min(1, 'Destination is required').max(200, 'Destination must be 200 characters or less').optional(),
  scheduledStart: z.coerce.date().optional(),
  status: TripStatus.optional(),
  startOdometer: z.number().nonnegative('Start odometer must be non-negative').optional(),
  endOdometer: z.number().nonnegative('End odometer must be non-negative').optional(),
  actualStart: z.coerce.date().optional(),
  actualEnd: z.coerce.date().optional(),
  issueReported: z.boolean().optional(),
  issueDescription: z.string().max(1000, 'Issue description must be 1000 characters or less').optional()
})

// Trip completion schema
// Validates: Requirements 12.7
export const tripCompletionSchema = z.object({
  endOdometer: z.number().nonnegative('End odometer must be non-negative'),
  actualEnd: z.coerce.date().optional()
}).refine(
  (data) => data.endOdometer !== undefined && data.endOdometer !== null,
  { message: 'Final odometer reading is required for trip completion' }
)

// Driver validation schema
// Validates: Requirements 12.2
export const driverSchema = z.object({
  userId: z.string().cuid('Invalid user ID format'),
  firstName: z.string().min(1, 'First name is required').max(50, 'First name must be 50 characters or less'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name must be 50 characters or less'),
  licenseNumber: z.string().min(1, 'License number is required').max(50, 'License number must be 50 characters or less'),
  licenseCategory: z.string().min(1, 'License category is required').max(10, 'License category must be 10 characters or less'),
  licenseExpiry: z.coerce.date().refine(
    (date) => date > new Date(),
    { message: 'License expiry date must be in the future' }
  ),
  status: DriverStatus.optional(),
  safetyScore: z.number().min(0, 'Safety score must be non-negative').max(100, 'Safety score must be 100 or less').optional()
})

// Driver update schema
export const driverUpdateSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name must be 50 characters or less').optional(),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name must be 50 characters or less').optional(),
  licenseNumber: z.string().min(1, 'License number is required').max(50, 'License number must be 50 characters or less').optional(),
  licenseCategory: z.string().min(1, 'License category is required').max(10, 'License category must be 10 characters or less').optional(),
  licenseExpiry: z.coerce.date().optional(),
  status: DriverStatus.optional(),
  safetyScore: z.number().min(0, 'Safety score must be non-negative').max(100, 'Safety score must be 100 or less').optional()
})

// Maintenance validation schema
// Validates: Requirements 12.8
export const maintenanceSchema = z.object({
  vehicleId: z.string().cuid('Invalid vehicle ID format'),
  serviceType: z.string().min(1, 'Service type is required').max(100, 'Service type must be 100 characters or less'),
  description: z.string().max(1000, 'Description must be 1000 characters or less').optional(),
  cost: z.number().positive('Maintenance cost must be a positive number'),
  odometer: z.number().nonnegative('Odometer reading must be non-negative'),
  serviceDate: z.coerce.date(),
  completedAt: z.coerce.date().optional()
})

// Maintenance update schema
export const maintenanceUpdateSchema = z.object({
  serviceType: z.string().min(1, 'Service type is required').max(100, 'Service type must be 100 characters or less').optional(),
  description: z.string().max(1000, 'Description must be 1000 characters or less').optional(),
  cost: z.number().positive('Maintenance cost must be a positive number').optional(),
  odometer: z.number().nonnegative('Odometer reading must be non-negative').optional(),
  serviceDate: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional()
})

// Fuel log validation schema
// Validates: Requirements 12.8
export const fuelLogSchema = z.object({
  vehicleId: z.string().cuid('Invalid vehicle ID format'),
  liters: z.number().positive('Fuel liters must be a positive number'),
  cost: z.number().positive('Fuel cost must be a positive number'),
  pricePerLiter: z.number().positive('Price per liter must be a positive number'),
  odometer: z.number().nonnegative('Odometer reading must be non-negative'),
  fuelDate: z.coerce.date()
})

// Expense validation schema
// Validates: Requirements 12.8
export const expenseSchema = z.object({
  vehicleId: z.string().cuid('Invalid vehicle ID format').optional(),
  tripId: z.string().cuid('Invalid trip ID format').optional(),
  category: z.string().min(1, 'Expense category is required').max(100, 'Category must be 100 characters or less'),
  description: z.string().max(1000, 'Description must be 1000 characters or less').optional(),
  amount: z.number().positive('Expense amount must be a positive number'),
  expenseDate: z.coerce.date()
}).refine(
  (data) => data.vehicleId || data.tripId,
  { message: 'Either vehicleId or tripId must be provided' }
)

// User/Authentication validation schemas
export const userRegistrationSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: Role
})

export const userLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
})

export const passwordResetRequestSchema = z.object({
  email: z.string().email('Invalid email address')
})

export const passwordResetSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters')
})

export const invitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: Role.refine(
    (role) => role === 'DISPATCHER' || role === 'DRIVER',
    { message: 'Can only invite Dispatcher or Driver roles' }
  )
})

// Notification validation schema
export const notificationSchema = z.object({
  userId: z.string().cuid('Invalid user ID format'),
  type: z.string().min(1, 'Notification type is required'),
  message: z.string().min(1, 'Notification message is required'),
  metadata: z.record(z.any()).optional()
})

// Audit log validation schema
export const auditLogSchema = z.object({
  userId: z.string().cuid('Invalid user ID format'),
  action: z.string().min(1, 'Action is required'),
  resource: z.string().min(1, 'Resource is required'),
  resourceId: z.string().optional(),
  metadata: z.record(z.any()).optional()
})

// Helper function to validate data against a schema
export function validateData(schema, data) {
  try {
    const validated = schema.parse(data)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      }
    }
    throw error
  }
}

// Helper function for async validation
export async function validateDataAsync(schema, data) {
  try {
    const validated = await schema.parseAsync(data)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      }
    }
    throw error
  }
}
