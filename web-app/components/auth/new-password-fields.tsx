'use client';

import type { FieldValues, Path, UseFormRegister } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { PASSWORD_HINT } from '@/lib/validation';

interface NewPasswordValues extends FieldValues {
  password: string;
  confirmPassword: string;
}

/** "New password" + "confirm" pair, shared by the invite and reset pages (forms may have more fields). */
type FieldMessage = { message?: string } | undefined;

export function NewPasswordFields<T extends NewPasswordValues>({
  register,
  errors
}: {
  register: UseFormRegister<T>;
  errors: { password?: FieldMessage; confirmPassword?: FieldMessage };
}) {
  return (
    <FieldGroup>
      <Field data-invalid={!!errors.password}>
        <FieldLabel htmlFor="password">Nova palavra-passe</FieldLabel>
        <Input id="password" type="password" autoComplete="new-password" className="h-11" aria-invalid={!!errors.password} {...register('password' as Path<T>)} />
        <FieldDescription>{PASSWORD_HINT}</FieldDescription>
        <FieldError errors={[errors.password]} />
      </Field>
      <Field data-invalid={!!errors.confirmPassword}>
        <FieldLabel htmlFor="confirmPassword">Confirmar palavra-passe</FieldLabel>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          className="h-11"
          aria-invalid={!!errors.confirmPassword}
          {...register('confirmPassword' as Path<T>)}
        />
        <FieldError errors={[errors.confirmPassword]} />
      </Field>
    </FieldGroup>
  );
}
