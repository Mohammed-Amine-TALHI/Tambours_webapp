<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PasswordTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_change_their_password(): void
    {
        $user = User::factory()->mustChangePassword()->create([
            'password' => 'Old@Passw0rd123',
        ]);

        $this->actingAs($user)->postJson('/api/password/change', [
            'current_password'          => 'Old@Passw0rd123',
            'new_password'              => 'New@Passw0rd456',
            'new_password_confirmation' => 'New@Passw0rd456',
        ])->assertOk();

        $user->refresh();
        $this->assertTrue(Hash::check('New@Passw0rd456', $user->password));
        $this->assertFalse($user->must_change_password);
    }

    public function test_new_password_must_differ_from_current(): void
    {
        $user = User::factory()->create(['password' => 'Same@Passw0rd123']);

        $this->actingAs($user)->postJson('/api/password/change', [
            'current_password'          => 'Same@Passw0rd123',
            'new_password'              => 'Same@Passw0rd123',
            'new_password_confirmation' => 'Same@Passw0rd123',
        ])->assertStatus(422)->assertJsonValidationErrors('new_password');
    }

    public function test_password_can_be_reset_with_a_valid_otp(): void
    {
        $user = User::factory()->create([
            'email'    => 'reset@ocpgroup.ma',
            'password' => 'Old@Passw0rd123',
        ]);

        $this->seedOtp('reset@ocpgroup.ma', '123456');

        $this->postJson('/api/password/reset', [
            'email'                     => 'reset@ocpgroup.ma',
            'otp'                       => '123456',
            'new_password'              => 'Brand@New0rd789',
            'new_password_confirmation' => 'Brand@New0rd789',
        ])->assertOk();

        $this->assertTrue(Hash::check('Brand@New0rd789', $user->fresh()->password));

        // The used OTP is burned.
        $this->assertNotNull(
            DB::table('password_reset_otps')->where('email', 'reset@ocpgroup.ma')->value('used_at')
        );
    }

    public function test_reset_with_wrong_otp_increments_attempts(): void
    {
        User::factory()->create([
            'email'    => 'reset2@ocpgroup.ma',
            'password' => 'Old@Passw0rd123',
        ]);

        $this->seedOtp('reset2@ocpgroup.ma', '123456');

        $this->postJson('/api/password/reset', [
            'email'                     => 'reset2@ocpgroup.ma',
            'otp'                       => '000000',
            'new_password'              => 'Brand@New0rd789',
            'new_password_confirmation' => 'Brand@New0rd789',
        ])->assertStatus(422)->assertJsonValidationErrors('otp');

        $this->assertSame(
            1,
            (int) DB::table('password_reset_otps')->where('email', 'reset2@ocpgroup.ma')->value('attempts')
        );
    }

    private function seedOtp(string $email, string $code): void
    {
        DB::table('password_reset_otps')->insert([
            'email'      => $email,
            'otp_hash'   => Hash::make($code),
            'expires_at' => now()->addMinutes(10),
            'attempts'   => 0,
            'used_at'    => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
