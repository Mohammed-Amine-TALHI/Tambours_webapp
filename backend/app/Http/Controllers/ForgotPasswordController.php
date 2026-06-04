<?php

namespace App\Http\Controllers;

use App\Mail\PasswordResetOtpMail;
use App\Models\User;
use App\Rules\StrongPassword;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class ForgotPasswordController extends Controller
{
    /** OTP rules */
    private const OTP_LENGTH          = 6;
    private const OTP_EXPIRES_MINUTES = 10;
    private const OTP_MAX_ATTEMPTS    = 5;
    private const OTP_COOLDOWN_SECS   = 120;   // 1 new OTP per 2 minutes

    /**
     * POST /api/password/forgot
     * Body: { email }
     *
     * Always returns 200 regardless of whether the email exists,
     * to avoid leaking user enumeration.
     */
    public function request(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:220'],
        ]);

        $email = strtolower($validated['email']);
        $user  = User::where('email', $email)->where('is_active', true)->first();

        // Generic success response (always)
        $genericResponse = response()->json([
            'message' => 'Si un compte existe pour cette adresse, un code de réinitialisation a été envoyé.',
        ]);

        if (! $user) {
            return $genericResponse;
        }

        // Rate-limit: no new OTP within cooldown window
        $recent = DB::table('password_reset_otps')
            ->where('email', $email)
            ->whereNull('used_at')
            ->where('created_at', '>=', now()->subSeconds(self::OTP_COOLDOWN_SECS))
            ->exists();

        if ($recent) {
            return $genericResponse;   // silent — still return generic
        }

        // Invalidate any older outstanding OTPs for this email
        DB::table('password_reset_otps')
            ->where('email', $email)
            ->whereNull('used_at')
            ->update(['used_at' => now()]);

        // Generate a fresh OTP
        $otp = str_pad((string) random_int(0, 10 ** self::OTP_LENGTH - 1), self::OTP_LENGTH, '0', STR_PAD_LEFT);

        DB::table('password_reset_otps')->insert([
            'email'      => $email,
            'otp_hash'   => Hash::make($otp),
            'expires_at' => now()->addMinutes(self::OTP_EXPIRES_MINUTES),
            'attempts'   => 0,
            'used_at'    => null,
            'ip_address' => $request->ip(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Send email (driver = log will write it to laravel.log)
        try {
            Mail::to($email)->send(new PasswordResetOtpMail(
                firstName:        $user->first_name,
                otp:              $otp,
                expiresInMinutes: self::OTP_EXPIRES_MINUTES,
            ));
        } catch (\Throwable $e) {
            Log::error('Failed to send password reset OTP', [
                'email' => $email,
                'error' => $e->getMessage(),
            ]);
            // Still return generic success — don't expose mail failures
        }

        return $genericResponse;
    }

    /**
     * POST /api/password/reset
     * Body: { email, otp, new_password, new_password_confirmation }
     */
    public function reset(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email'        => ['required', 'email'],
            'otp'          => ['required', 'string', 'digits:' . self::OTP_LENGTH],
            'new_password' => ['required', 'string', 'confirmed', new StrongPassword],
        ]);

        $email = strtolower($validated['email']);

        $otpRow = DB::table('password_reset_otps')
            ->where('email', $email)
            ->whereNull('used_at')
            ->where('expires_at', '>=', now())
            ->orderByDesc('id')
            ->first();

        if (! $otpRow) {
            throw ValidationException::withMessages([
                'otp' => ['Code invalide ou expiré.'],
            ]);
        }

        if ($otpRow->attempts >= self::OTP_MAX_ATTEMPTS) {
            // Burn the OTP
            DB::table('password_reset_otps')->where('id', $otpRow->id)->update(['used_at' => now()]);
            throw ValidationException::withMessages([
                'otp' => ['Trop de tentatives. Demandez un nouveau code.'],
            ]);
        }

        if (! Hash::check($validated['otp'], $otpRow->otp_hash)) {
            DB::table('password_reset_otps')->where('id', $otpRow->id)->increment('attempts');
            throw ValidationException::withMessages([
                'otp' => ['Code incorrect.'],
            ]);
        }

        // OTP is valid — find user and update password
        $user = User::where('email', $email)->first();
        if (! $user || ! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['Compte introuvable ou désactivé.'],
            ]);
        }

        $user->forceFill([
            'password'             => $validated['new_password'], // hashed cast
            'must_change_password' => false,
            'password_changed_at'  => now(),
            'failed_login_count'   => 0,
            'locked_until'         => null,
        ])->save();

        // Burn the OTP
        DB::table('password_reset_otps')
            ->where('id', $otpRow->id)
            ->update(['used_at' => now(), 'updated_at' => now()]);

        // Also burn any other outstanding OTPs for this email
        DB::table('password_reset_otps')
            ->where('email', $email)
            ->whereNull('used_at')
            ->update(['used_at' => now()]);

        return response()->json([
            'message' => 'Mot de passe réinitialisé. Vous pouvez maintenant vous connecter.',
        ]);
    }
}
