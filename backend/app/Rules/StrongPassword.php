<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Strong password rule:
 *  - Min 12 chars
 *  - At least one uppercase, one lowercase, one digit, one symbol
 */
class StrongPassword implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            $fail('The :attribute must be a string.');
            return;
        }

        if (strlen($value) < 12) {
            $fail('The :attribute must be at least 12 characters.');
        }
        if (! preg_match('/[A-Z]/', $value)) {
            $fail('The :attribute must contain at least one uppercase letter.');
        }
        if (! preg_match('/[a-z]/', $value)) {
            $fail('The :attribute must contain at least one lowercase letter.');
        }
        if (! preg_match('/[0-9]/', $value)) {
            $fail('The :attribute must contain at least one digit.');
        }
        if (! preg_match('/[^A-Za-z0-9]/', $value)) {
            $fail('The :attribute must contain at least one symbol.');
        }
    }
}
