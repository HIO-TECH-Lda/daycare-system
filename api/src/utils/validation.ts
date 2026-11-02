import * as Joi from 'joi';
import Messages from './messages';

// Shared password rule: 8+ chars with upper, lower, digit and special character
const strongPassword = Joi.string()
  .min(8)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .messages({
    'string.min': 'A senha deve ter pelo menos 8 caracteres',
    'string.pattern.base':
      'A senha deve ter pelo menos uma letra maiúscula, uma minúscula, um número e um carácter especial (@$!%*?&)'
  });

const personName = (label: string) =>
  Joi.string().trim().min(2).max(50).messages({
    'string.min': `${label} deve ter pelo menos 2 caracteres`,
    'string.max': `${label} não pode exceder 50 caracteres`,
    'any.required': `${label} é obrigatório`
  });

// Admin creates a user; the user receives an invite and sets their own password
export const createUserSchema = Joi.object({
  firstName: personName('O nome').required(),
  lastName: personName('O apelido').required(),
  email: Joi.string().email().lowercase().trim().required().messages({
    'string.email': 'Email inválido',
    'any.required': 'O email é obrigatório'
  }),
  role: Joi.string().valid('responsavel', 'staff', 'administrador').required().messages({
    'any.only': 'Perfil inválido',
    'any.required': 'O perfil é obrigatório'
  }),
  phone: Joi.string().trim().allow('').optional()
});

export const updateUserSchema = Joi.object({
  firstName: personName('O nome'),
  lastName: personName('O apelido'),
  email: Joi.string().email().lowercase().trim().messages({ 'string.email': 'Email inválido' }),
  role: Joi.string().valid('responsavel', 'staff', 'administrador').messages({ 'any.only': 'Perfil inválido' }),
  phone: Joi.string().trim().allow('')
}).min(1);

export const userStatusSchema = Joi.object({
  status: Joi.string().valid('active', 'inactive', 'suspended').required().messages({
    'any.only': 'Estado inválido',
    'any.required': 'O estado é obrigatório'
  })
});

export const acceptInviteSchema = Joi.object({
  token: Joi.string().required().messages({ 'any.required': 'O token do convite é obrigatório' }),
  password: strongPassword.required().messages({ 'any.required': 'A senha é obrigatória' }),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'As senhas não coincidem',
    'any.required': 'Confirme a senha'
  }),
  whatsappOptIn: Joi.boolean().default(false)
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email inválido',
    'any.required': 'O email é obrigatório'
  })
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({ 'any.required': 'O token é obrigatório' }),
  newPassword: strongPassword.required().messages({ 'any.required': 'A nova senha é obrigatória' }),
  confirmNewPassword: Joi.string().valid(Joi.ref('newPassword')).optional().messages({
    'any.only': 'As senhas não coincidem'
  })
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  })
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Current password is required'
  }),
  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'New password must be at least 8 characters',
      'string.pattern.base':
        'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'New password is required'
    }),
  confirmNewPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'New passwords do not match',
      'any.required': 'Please confirm your new password'
    })
});

export const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).messages({
    'string.min': 'First name must be at least 2 characters',
    'string.max': 'First name cannot exceed 50 characters'
  }),
  lastName: Joi.string().min(2).max(50).messages({
    'string.min': 'Last name must be at least 2 characters',
    'string.max': 'Last name cannot exceed 50 characters'
  }),
  phone: Joi.string().optional().allow(''),
  avatar: Joi.string().optional().allow('')
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'Refresh token is required'
  })
});

export const createClassSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    'any.required': 'Nome da turma é obrigatório',
    'string.empty': 'Nome da turma não pode estar vazio'
  }),
  min_age_months: Joi.number().integer().min(0).required().messages({
    'any.required': 'Idade mínima em meses é obrigatória',
    'number.min': 'Idade mínima não pode ser negativa',
    'number.base': 'Idade mínima deve ser um número'
  }),
  max_age_months: Joi.number().integer().min(0).required().messages({
    'any.required': 'Idade máxima em meses é obrigatória',
    'number.min': 'Idade máxima não pode ser negativa',
    'number.base': 'Idade máxima deve ser um número'
  }),
  capacity: Joi.number().integer().min(1).required().messages({
    'any.required': 'Capacidade é obrigatória',
    'number.min': 'Capacidade deve ser pelo menos 1',
    'number.base': 'Capacidade deve ser um número'
  })
}).custom((value, helpers) => {
  if (value.max_age_months < value.min_age_months) {
    return helpers.error('any.custom', {
      message: 'Idade máxima deve ser maior ou igual à idade mínima'
    });
  }
  return value;
});

export const updateClassSchema = Joi.object({
  name: Joi.string().trim().optional(),
  min_age_months: Joi.number().integer().min(0).optional(),
  max_age_months: Joi.number().integer().min(0).optional(),
  capacity: Joi.number().integer().min(1).optional()
}).custom((value, helpers) => {
  if (value.max_age_months !== undefined && value.min_age_months !== undefined) {
    if (value.max_age_months < value.min_age_months) {
      return helpers.error('any.custom', {
        message: 'Idade máxima deve ser maior ou igual à idade mínima'
      });
    }
  }
  return value;
});

export const createChildSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    'any.required': 'Nome da criança é obrigatório',
    'string.empty': 'Nome da criança não pode estar vazio'
  }),
  birth_date: Joi.date().required().messages({
    'any.required': 'Data de nascimento é obrigatória',
    'date.base': 'Data de nascimento inválida'
  }),
  class_id: Joi.string().required().messages({
    'any.required': 'Turma é obrigatória',
    'string.empty': 'Turma não pode estar vazia'
  }),
  parent_id: Joi.string().required().messages({
    'any.required': 'Responsável é obrigatório',
    'string.empty': 'Responsável não pode estar vazio'
  }),
  photo_url: Joi.string().uri().optional().allow(''),
  allergies: Joi.string().optional().allow(''),
  medications: Joi.string().optional().allow(''),
  emergency_contact_name: Joi.string().optional().allow(''),
  emergency_contact_phone: Joi.string().optional().allow(''),
  gender: Joi.string().valid('Masculino', 'Feminino').optional(),
  nationality: Joi.string().optional().allow(''),
  address: Joi.string().optional().allow(''),
  languages_spoken: Joi.string().optional().allow(''),
  dietary_restrictions: Joi.string().optional().allow(''),
  sleep_schedule: Joi.string().optional().allow(''),
  preferred_foods: Joi.string().optional().allow(''),
  separation_reaction: Joi.string().optional().allow(''),
  plays_with_others: Joi.boolean().optional(),
  behavior_notes: Joi.string().optional().allow(''),
  previous_center: Joi.string().optional().allow(''),
  transfer_reason: Joi.string().optional().allow(''),
  image_usage_authorized: Joi.boolean().optional(),
  enrollment_signature: Joi.string().optional().allow(''),
  enrollment_date: Joi.date().optional()
});

export const updateChildSchema = Joi.object({
  name: Joi.string().trim().optional(),
  birth_date: Joi.date().optional(),
  class_id: Joi.string().optional(),
  parent_id: Joi.string().optional(),
  photo_url: Joi.string().uri().optional().allow(''),
  allergies: Joi.string().optional().allow(''),
  medications: Joi.string().optional().allow(''),
  emergency_contact_name: Joi.string().optional().allow(''),
  emergency_contact_phone: Joi.string().optional().allow(''),
  gender: Joi.string().valid('Masculino', 'Feminino').optional(),
  nationality: Joi.string().optional().allow(''),
  address: Joi.string().optional().allow(''),
  languages_spoken: Joi.string().optional().allow(''),
  dietary_restrictions: Joi.string().optional().allow(''),
  sleep_schedule: Joi.string().optional().allow(''),
  preferred_foods: Joi.string().optional().allow(''),
  separation_reaction: Joi.string().optional().allow(''),
  plays_with_others: Joi.boolean().optional(),
  behavior_notes: Joi.string().optional().allow(''),
  previous_center: Joi.string().optional().allow(''),
  transfer_reason: Joi.string().optional().allow(''),
  image_usage_authorized: Joi.boolean().optional(),
  enrollment_signature: Joi.string().optional().allow(''),
  enrollment_date: Joi.date().optional()
});

export const createStaffAssignmentSchema = Joi.object({
  staff_id: Joi.string().required().messages({
    'any.required': 'ID do staff é obrigatório',
    'string.empty': 'ID do staff não pode estar vazio'
  }),
  class_id: Joi.string().required().messages({
    'any.required': 'ID da turma é obrigatório',
    'string.empty': 'ID da turma não pode estar vazio'
  })
});

export const createGuardianSchema = Joi.object({
  child_id: Joi.string().required().messages({
    'any.required': 'ID da criança é obrigatório',
    'string.empty': 'ID da criança não pode estar vazio'
  }),
  name: Joi.string().trim().required().messages({
    'any.required': 'Nome do responsável é obrigatório',
    'string.empty': 'Nome do responsável não pode estar vazio'
  }),
  profession: Joi.string().optional().allow(''),
  workplace: Joi.string().optional().allow(''),
  relationship: Joi.string().trim().optional().allow(''),
  phone: Joi.string().optional().allow(''),
  email: Joi.string().email().optional().allow(''),
  address: Joi.string().optional().allow(''),
  guardian_type: Joi.number().valid(1, 2).required().messages({
    'any.required': 'Tipo de responsável é obrigatório (1 = primário, 2 = secundário)',
    'any.only': 'Tipo deve ser 1 (primário) ou 2 (secundário)'
  })
});

export const updateGuardianSchema = Joi.object({
  name: Joi.string().trim().optional(),
  profession: Joi.string().optional().allow(''),
  workplace: Joi.string().optional().allow(''),
  relationship: Joi.string().trim().optional().allow(''),
  phone: Joi.string().optional().allow(''),
  email: Joi.string().email().optional().allow(''),
  address: Joi.string().optional().allow(''),
  guardian_type: Joi.number().valid(1, 2).optional()
});

export const createPickupPersonSchema = Joi.object({
  child_id: Joi.string().required().messages({
    'any.required': 'ID da criança é obrigatório'
  }),
  name: Joi.string().trim().required().messages({
    'any.required': 'Nome é obrigatório'
  }),
  relationship: Joi.string().optional().allow(''),
  phone: Joi.string().required().messages({
    'any.required': 'Telefone é obrigatório'
  }),
  email: Joi.string().email().optional().allow(''),
  id_document: Joi.string().optional().allow(''),
  photo_url: Joi.string().uri().optional().allow(''),
  is_authorized: Joi.boolean().optional()
});

export const updatePickupPersonSchema = Joi.object({
  name: Joi.string().trim().optional(),
  relationship: Joi.string().optional().allow(''),
  phone: Joi.string().optional(),
  email: Joi.string().email().optional().allow(''),
  id_document: Joi.string().optional().allow(''),
  photo_url: Joi.string().uri().optional().allow(''),
  is_authorized: Joi.boolean().optional()
});

export const createDailyReportSchema = Joi.object({
  child_id: Joi.string().required().messages({
    'any.required': 'ID da criança é obrigatório'
  }),
  date: Joi.date().optional(),
  meals: Joi.object({
    breakfast: Joi.string().optional().allow(''),
    lunch: Joi.string().optional().allow(''),
    snack: Joi.string().optional().allow(''),
    dinner: Joi.string().optional().allow('')
  }).optional(),
  activities: Joi.array().items(Joi.string()).optional(),
  nap_time: Joi.object({
    start: Joi.date().optional(),
    end: Joi.date().optional(),
    duration_minutes: Joi.number().optional()
  }).optional(),
  mood: Joi.string().optional().allow(''),
  notes: Joi.string().optional().allow(''),
  behavior_notes: Joi.string().optional().allow(''),
  health_notes: Joi.string().optional().allow('')
});

export const updateDailyReportSchema = createDailyReportSchema;

export const createActivitySchema = Joi.object({
  name: Joi.string().trim().required().messages({
    'any.required': 'Nome da atividade é obrigatório'
  }),
  description: Joi.string().optional().allow(''),
  class_id: Joi.string().optional(),
  age_group: Joi.string().optional().allow(''),
  duration_minutes: Joi.number().min(0).optional(),
  materials_needed: Joi.array().items(Joi.string()).optional(),
  learning_objectives: Joi.array().items(Joi.string()).optional(),
  is_active: Joi.boolean().optional()
});

export const updateActivitySchema = createActivitySchema;

export const createReportPhotoSchema = Joi.object({
  daily_report_id: Joi.string().required().messages({
    'any.required': 'ID do relatório é obrigatório'
  }),
  // Optional when a file is uploaded directly; controller validates that at least one is present
  photo_url: Joi.string().optional().allow(''),
  caption: Joi.string().optional().allow('')
});

export const createAttendanceSchema = Joi.object({
  child_id: Joi.string().required().messages({
    'any.required': 'ID da criança é obrigatório'
  }),
  date: Joi.date().required().messages({
    'any.required': 'Data é obrigatória'
  }),
  check_in: Joi.date().optional(),
  check_out: Joi.date().optional(),
  status: Joi.string().valid('present', 'absent', 'late', 'excused').required().messages({
    'any.required': 'Status é obrigatório'
  }),
  notes: Joi.string().optional().allow('')
});

export const updateAttendanceSchema = Joi.object({
  check_in: Joi.date().optional(),
  check_out: Joi.date().optional(),
  status: Joi.string().valid('present', 'absent', 'late', 'excused').optional(),
  notes: Joi.string().optional().allow('')
});

export const createCalendarEventSchema = Joi.object({
  title: Joi.string().trim().required().messages({
    'any.required': 'Título é obrigatório'
  }),
  description: Joi.string().optional().allow(''),
  start_date: Joi.date().required().messages({
    'any.required': 'Data de início é obrigatória'
  }),
  end_date: Joi.date().optional(),
  is_all_day: Joi.boolean().optional(),
  event_type: Joi.string().valid('holiday', 'activity', 'meeting', 'reminder', 'other').optional(),
  class_id: Joi.string().optional()
});

export const updateCalendarEventSchema = createCalendarEventSchema;

export const createInvoiceSchema = Joi.object({
  child_id: Joi.string().required().messages({
    'any.required': 'ID da criança é obrigatório'
  }),
  parent_id: Joi.string().required().messages({
    'any.required': 'ID do responsável é obrigatório'
  }),
  issue_date: Joi.date().optional(),
  due_date: Joi.date().required().messages({
    'any.required': 'Data de vencimento é obrigatória'
  }),
  amount: Joi.number().min(0).required().messages({
    'any.required': 'Valor é obrigatório'
  }),
  items: Joi.array().items(Joi.object({
    description: Joi.string().required(),
    quantity: Joi.number().min(0).optional(),
    unit_price: Joi.number().min(0).required(),
    total: Joi.number().min(0).required()
  })).required().messages({
    'any.required': 'Itens são obrigatórios'
  }),
  notes: Joi.string().optional().allow('')
});

export const updateInvoiceSchema = Joi.object({
  due_date: Joi.date().optional(),
  amount: Joi.number().min(0).optional(),
  items: Joi.array().items(Joi.object({
    description: Joi.string().required(),
    quantity: Joi.number().min(0).optional(),
    unit_price: Joi.number().min(0).required(),
    total: Joi.number().min(0).required()
  })).optional(),
  notes: Joi.string().optional().allow(''),
  status: Joi.string().valid('pending', 'paid', 'overdue', 'cancelled').optional()
});

export const createPaymentSchema = Joi.object({
  invoice_id: Joi.string().optional().allow(''),
  parent_id: Joi.string().required().messages({
    'any.required': 'ID do responsável é obrigatório'
  }),
  child_id: Joi.string().required().messages({
    'any.required': 'ID da criança é obrigatório'
  }),
  amount: Joi.number().min(0).required().messages({
    'any.required': 'Valor é obrigatório'
  }),
  payment_date: Joi.date().optional(),
  payment_method: Joi.string().valid('cash', 'card', 'bank_transfer', 'check', 'mobile_money', 'other').required().messages({
    'any.required': 'Método de pagamento é obrigatório'
  }),
  payment_method_details: Joi.string().optional().allow(''),
  reference_number: Joi.string().optional().allow(''),
  notes: Joi.string().optional().allow('')
});

export const createExpenseCategorySchema = Joi.object({
  name: Joi.string().trim().required().messages({
    'any.required': 'Nome da categoria é obrigatório'
  }),
  description: Joi.string().optional().allow(''),
  is_active: Joi.boolean().optional()
});

export const updateExpenseCategorySchema = Joi.object({
  name: Joi.string().trim().optional(),
  description: Joi.string().optional().allow(''),
  is_active: Joi.boolean().optional()
});

export const createExpenseSchema = Joi.object({
  category_id: Joi.string().required().messages({
    'any.required': 'ID da categoria é obrigatório'
  }),
  amount: Joi.number().min(0).required().messages({
    'any.required': 'Valor é obrigatório'
  }),
  description: Joi.string().trim().required().messages({
    'any.required': 'Descrição é obrigatória'
  }),
  expense_date: Joi.date().optional(),
  receipt_url: Joi.string().uri().optional().allow(''),
  vendor: Joi.string().optional().allow('')
});

export const updateExpenseSchema = Joi.object({
  category_id: Joi.string().optional(),
  amount: Joi.number().min(0).optional(),
  description: Joi.string().trim().optional(),
  expense_date: Joi.date().optional(),
  receipt_url: Joi.string().uri().optional().allow(''),
  vendor: Joi.string().optional().allow('')
});

export const createMessageSchema = Joi.object({
  recipient_id: Joi.string().optional(),
  recipient_role: Joi.string().optional(),
  subject: Joi.string().trim().required().messages({
    'any.required': 'Assunto é obrigatório'
  }),
  content: Joi.string().required().messages({
    'any.required': 'Conteúdo é obrigatório'
  }),
  message_type: Joi.string().valid('info', 'reminder', 'alert', 'general').optional(),
  child_id: Joi.string().optional()
});

export const createMonthlyReportSchema = Joi.object({
  child_id: Joi.string().required().messages({
    'any.required': 'ID da criança é obrigatório'
  }),
  month: Joi.number().integer().min(1).max(12).required().messages({
    'any.required': 'Mês é obrigatório'
  }),
  year: Joi.number().integer().min(2000).required().messages({
    'any.required': 'Ano é obrigatório'
  }),
  status: Joi.string().valid('draft', 'submitted', 'validated', 'rejected').optional(),
  rejection_reason: Joi.string().optional().allow(''),
  attendance_summary: Joi.object({
    total_days: Joi.number().min(0).optional(),
    present_days: Joi.number().min(0).optional(),
    absent_days: Joi.number().min(0).optional(),
    late_days: Joi.number().min(0).optional()
  }).optional(),
  physical_development: Joi.string().optional().allow(''),
  cognitive_development: Joi.string().optional().allow(''),
  social_development: Joi.string().optional().allow(''),
  emotional_development: Joi.string().optional().allow(''),
  general_notes: Joi.string().optional().allow(''),
  achievements: Joi.string().optional().allow(''),
  areas_for_improvement: Joi.string().optional().allow(''),
  development_notes: Joi.string().optional().allow(''),
  behavior_summary: Joi.string().optional().allow(''),
  activities_participated: Joi.array().items(Joi.string()).optional(),
  recommendations: Joi.string().optional().allow(''),
  parent_feedback: Joi.string().optional().allow('')
});

export const updateMonthlyReportSchema = createMonthlyReportSchema;

export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessages = error.details.map((d: any) => d.message);
      return res.status(400).json({
        success: false,
        message: Messages.ERROR.VALIDATION_FAILED,
        errors: errorMessages
      });
    }

    req.body = value;
    next();
  };
};
