<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_login_with_valid_credentials(): void
    {
        $user = User::factory()->create([
            'username' => 'alice',
            'password' => 'Str0ng@Password1',
        ]);

        $this->postJson('/api/login', [
            'login' => 'alice',
            'password' => 'Str0ng@Password1',
        ])->assertOk()->assertJsonPath('user.username', 'alice');

        $this->assertAuthenticatedAs($user);
    }

    public function test_wrong_password_is_rejected_and_counts_the_failure(): void
    {
        $user = User::factory()->create([
            'username' => 'bob',
            'password' => 'Str0ng@Password1',
        ]);

        $this->postJson('/api/login', ['login' => 'bob', 'password' => 'nope'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('login');

        $this->assertSame(1, $user->fresh()->failed_login_count);
        $this->assertGuest();
    }

    public function test_account_locks_after_max_failed_attempts(): void
    {
        $user = User::factory()->create([
            'username' => 'carol',
            'password' => 'Str0ng@Password1',
        ]);

        for ($i = 0; $i < User::MAX_FAILED_ATTEMPTS; $i++) {
            $this->postJson('/api/login', ['login' => 'carol', 'password' => 'nope'])
                ->assertStatus(422);
        }

        $user->refresh();
        $this->assertNotNull($user->locked_until);
        $this->assertTrue($user->isLocked());

        // Even the correct password is refused while the account is locked.
        $this->postJson('/api/login', ['login' => 'carol', 'password' => 'Str0ng@Password1'])
            ->assertStatus(422);
    }

    public function test_disabled_account_cannot_login(): void
    {
        User::factory()->inactive()->create([
            'username' => 'dave',
            'password' => 'Str0ng@Password1',
        ]);

        $this->postJson('/api/login', ['login' => 'dave', 'password' => 'Str0ng@Password1'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('login');

        $this->assertGuest();
    }

    public function test_logout_ends_the_session(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/api/logout')->assertOk();

        // auth:sanctum switched the default guard to "sanctum" and cached the
        // resolved user on it; logout() only clears the "web" guard. Forget the
        // resolved guards so the assertion runs against fresh state, mirroring
        // the next cookie-less request after the session was invalidated.
        $this->app['auth']->forgetGuards();

        $this->assertGuest();
    }
}
