import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your user ID."),
  password: z.string().min(1, "Enter your password."),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const studentRegistrationSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required."),
  last_name: z.string().trim().min(1, "Last name is required."),
  other_names: z.string().optional(),
  matric_number: z.string().trim().min(3, "Matric number is required."),
  faculty: z.string().optional(),
  department: z.string().optional(),
  level: z.string().optional(),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  phone_number: z.string().optional(),
  email: z.string().email("Enter a valid email address.").optional().or(z.literal("")),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  medical_notes: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export type StudentRegistrationFormValues = z.infer<typeof studentRegistrationSchema>;
