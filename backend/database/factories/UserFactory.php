<?php

namespace Database\Factories;

use App\Models\EmailDomain;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected $model = User::class;

    /**
     * The shared hashed password used by the factory ('password').
     */
    protected static ?string $password;

    /**
     * Default state — an active operator who has already changed their password.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'first_name'           => fake()->firstName(),
            'last_name'            => fake()->lastName(),
            'username'             => fake()->unique()->userName(),
            'email'                => fake()->unique()->safeEmail(),
            'email_domain_id'      => EmailDomain::factory(),
            'password'             => static::$password ??= Hash::make('password'),
            'role'                 => User::ROLE_OPERATEUR,
            'is_active'            => true,
            'must_change_password' => false,
        ];
    }

    /** Admin role. */
    public function admin(): static
    {
        return $this->state(fn () => ['role' => User::ROLE_ADMIN]);
    }

    /** Still on the one-time temp password (first-login flow). */
    public function mustChangePassword(): static
    {
        return $this->state(fn () => ['must_change_password' => true]);
    }

    /** Disabled account. */
    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }
}
