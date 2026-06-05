<?php

namespace Database\Factories;

use App\Models\EmailDomain;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EmailDomain>
 */
class EmailDomainFactory extends Factory
{
    protected $model = EmailDomain::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'domain'    => fake()->unique()->domainName(),
            'label'     => fake()->company(),
            'is_active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }
}
