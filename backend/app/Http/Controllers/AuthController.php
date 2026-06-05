<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * POST /api/login
     * Body: { username, password }
     *
     * Logs the user in via session (Sanctum SPA mode).
     */
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'username' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('username', $validated['username'])->first();

        // Generic message to avoid user enumeration
        if (! $user) {
            throw ValidationException::withMessages([
                'username' => ['Invalid credentials.'],
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'username' => ['Your account is disabled. Contact an administrator.'],
            ]);
        }

        if ($user->isLocked()) {
            throw ValidationException::withMessages([
                'username' => ['Account locked. Try again later.'],
            ]);
        }

        if (! Hash::check($validated['password'], $user->password)) {
            $user->increment('failed_login_count');

            if ($user->failed_login_count >= User::MAX_FAILED_ATTEMPTS) {
                // forceFill: locked_until / failed_login_count are intentionally
                // not mass-assignable, so update() would silently drop them and
                // the account would never actually lock.
                $user->forceFill([
                    'locked_until'       => now()->addMinutes(User::LOCKOUT_MINUTES),
                    'failed_login_count' => 0,
                ])->save();
            }

            throw ValidationException::withMessages([
                'username' => ['Invalid credentials.'],
            ]);
        }

        // Success — reset failed counters, record login, log in via session
        $user->forceFill([
            'failed_login_count' => 0,
            'locked_until'       => null,
            'last_login_at'      => now(),
            'last_login_ip'      => $request->ip(),
        ])->save();

        Auth::login($user);
        $request->session()->regenerate();

        return response()->json([
            'user' => $this->presentUser($user),
        ]);
    }

    /**
     * POST /api/logout
     */
    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Logged out.']);
    }

    /**
     * GET /api/me — returns current user (or null if not logged in).
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        return response()->json([
            'user' => $user ? $this->presentUser($user->fresh('emailDomain')) : null,
        ]);
    }

    /**
     * Shape the user payload the frontend consumes.
     */
    private function presentUser(User $user): array
    {
        return [
            'id'                   => $user->id,
            'first_name'           => $user->first_name,
            'last_name'            => $user->last_name,
            'username'             => $user->username,
            'email'                => $user->email,
            'role'                 => $user->role,
            'is_active'            => $user->is_active,
            'must_change_password' => $user->must_change_password,
            'last_login_at'        => $user->last_login_at,
        ];
    }
}
