<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\EmailDomain;
use App\Models\User;
use App\Support\PasswordGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminUserController extends Controller
{
    /**
     * GET /api/admin/users
     */
    public function index(): JsonResponse
    {
        $users = User::with('emailDomain:id,domain,label')
            ->orderByDesc('id')
            ->get()
            ->map(fn (User $u) => $this->present($u));

        return response()->json(['users' => $users]);
    }

    /**
     * POST /api/admin/users
     * Body: { first_name, last_name, username, email_local, email_domain_id, role }
     *
     * Returns the user PLUS the one-time temp password (shown once, never again).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'first_name'      => ['required', 'string', 'max:100'],
            'last_name'       => ['required', 'string', 'max:100'],
            'username'        => ['required', 'string', 'max:120', 'regex:/^[a-z0-9._-]+$/i', Rule::unique('users', 'username')],
            'email_local'     => ['required', 'string', 'max:120', 'regex:/^[a-zA-Z0-9._+-]+$/'],
            'email_domain_id' => ['required', 'integer', Rule::exists('email_domains', 'id')->where('is_active', true)],
            'role'            => ['required', Rule::in([User::ROLE_ADMIN, User::ROLE_OPERATEUR])],
        ]);

        $domain = EmailDomain::findOrFail($validated['email_domain_id']);
        $email  = strtolower($validated['email_local'] . '@' . $domain->domain);

        // Ensure the assembled email is unique across users (422 with errors.email_local).
        if (User::where('email', $email)->exists()) {
            throw ValidationException::withMessages([
                'email_local' => ['This email is already in use.'],
            ]);
        }

        $tempPassword = PasswordGenerator::generate(14);

        $user = User::create([
            'first_name'           => $validated['first_name'],
            'last_name'            => $validated['last_name'],
            'username'             => strtolower($validated['username']),
            'email'                => $email,
            'email_domain_id'      => $domain->id,
            'password'             => $tempPassword, // hashed cast
            'role'                 => $validated['role'],
            'is_active'            => true,
            'must_change_password' => true,
            'created_by'           => $request->user()->id,
        ]);

        return response()->json([
            'user'          => $this->present($user->load('emailDomain')),
            'temp_password' => $tempPassword,   // ⚠ shown ONCE to the admin
            'message'       => 'User created. Give the temp password to the user — it will not be shown again.',
        ], 201);
    }

    /**
     * PATCH /api/admin/users/{user}
     * Edit non-password fields.
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'first_name'      => ['sometimes', 'required', 'string', 'max:100'],
            'last_name'       => ['sometimes', 'required', 'string', 'max:100'],
            'role'            => ['sometimes', 'required', Rule::in([User::ROLE_ADMIN, User::ROLE_OPERATEUR])],
            'is_active'       => ['sometimes', 'required', 'boolean'],
        ]);

        // Prevent an admin from disabling/demoting themselves
        if ($user->id === $request->user()->id) {
            if (array_key_exists('is_active', $validated) && ! $validated['is_active']) {
                return response()->json(['message' => 'You cannot disable your own account.'], 422);
            }
            if (array_key_exists('role', $validated) && $validated['role'] !== User::ROLE_ADMIN) {
                return response()->json(['message' => 'You cannot change your own role.'], 422);
            }
        }

        $user->update($validated);

        return response()->json(['user' => $this->present($user->fresh('emailDomain'))]);
    }

    /**
     * PATCH /api/admin/users/{user}/reset-password
     * Generates a new one-time temp password.
     */
    public function resetPassword(Request $request, User $user): JsonResponse
    {
        if ($user->id === $request->user()->id) {
            return response()->json([
                'message' => 'Use the password change form for your own password.',
            ], 422);
        }

        $tempPassword = PasswordGenerator::generate(14);

        $user->forceFill([
            'password'             => $tempPassword,
            'must_change_password' => true,
            'failed_login_count'   => 0,
            'locked_until'         => null,
        ])->save();

        return response()->json([
            'user'          => $this->present($user->fresh('emailDomain')),
            'temp_password' => $tempPassword,
            'message'       => 'Password reset. Give the new temp password to the user.',
        ]);
    }

    /**
     * DELETE /api/admin/users/{user}
     */
    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'You cannot delete your own account.'], 422);
        }

        $user->delete();
        return response()->json(['message' => 'User deleted.']);
    }

    /**
     * Shape user for the frontend.
     */
    private function present(User $user): array
    {
        return [
            'id'                   => $user->id,
            'first_name'           => $user->first_name,
            'last_name'            => $user->last_name,
            'username'             => $user->username,
            'email'                => $user->email,
            'email_domain'         => $user->emailDomain ? [
                'id'     => $user->emailDomain->id,
                'domain' => $user->emailDomain->domain,
                'label'  => $user->emailDomain->label,
            ] : null,
            'role'                 => $user->role,
            'is_active'            => $user->is_active,
            'must_change_password' => $user->must_change_password,
            'last_login_at'        => $user->last_login_at,
            'created_at'           => $user->created_at,
        ];
    }
}
