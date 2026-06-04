<?php

namespace App\Http\Controllers;

use App\Rules\StrongPassword;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class PasswordController extends Controller
{
    /**
     * POST /api/password/change
     * Body: { current_password, new_password, new_password_confirmation }
     *
     * Used for BOTH first-time forced change and voluntary changes.
     */
    public function change(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password'           => ['required', 'string'],
            'new_password'               => ['required', 'string', 'confirmed', new StrongPassword],
        ]);

        $user = $request->user();

        if (! Hash::check($validated['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Current password is incorrect.'],
            ]);
        }

        if (Hash::check($validated['new_password'], $user->password)) {
            throw ValidationException::withMessages([
                'new_password' => ['New password must be different from the current one.'],
            ]);
        }

        $user->forceFill([
            'password'             => $validated['new_password'], // hashed cast
            'must_change_password' => false,
            'password_changed_at'  => now(),
        ])->save();

        return response()->json(['message' => 'Password updated.']);
    }
}
