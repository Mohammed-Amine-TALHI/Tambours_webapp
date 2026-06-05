<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccessControlTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_unauthenticated_on_protected_route(): void
    {
        $this->getJson('/api/schema/master')->assertStatus(401);
    }

    public function test_operator_cannot_access_admin_routes(): void
    {
        $operator = User::factory()->create(); // operator, password already changed

        $this->actingAs($operator)
            ->getJson('/api/admin/users')
            ->assertStatus(403);
    }

    public function test_admin_can_access_admin_routes(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->getJson('/api/admin/users')
            ->assertOk()
            ->assertJsonStructure(['users']);
    }

    public function test_user_must_change_password_before_using_the_app(): void
    {
        $user = User::factory()->mustChangePassword()->create();

        $this->actingAs($user)
            ->getJson('/api/schema/master')
            ->assertStatus(403)
            ->assertJsonPath('must_change_password', true);
    }

    public function test_user_can_use_the_app_after_password_changed(): void
    {
        $user = User::factory()->create(); // must_change_password = false

        $this->actingAs($user)
            ->getJson('/api/schema/master')
            ->assertOk();
    }
}
