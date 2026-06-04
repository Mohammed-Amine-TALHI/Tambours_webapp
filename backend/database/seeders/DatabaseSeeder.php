<?php

namespace Database\Seeders;

use App\Models\EmailDomain;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // ----- 1) Email domains ---------------------------------------
        $domains = [
            ['domain' => 'ocpgroup.ma', 'label' => 'OCP Group'],
            ['domain' => 'smesi.ma',    'label' => 'SMESI'],
        ];

        foreach ($domains as $d) {
            EmailDomain::firstOrCreate(
                ['domain' => $d['domain']],
                ['label' => $d['label'], 'is_active' => true]
            );
        }

        $ocp = EmailDomain::where('domain', 'ocpgroup.ma')->first();

        // ----- 2) Default admin ---------------------------------------
        // Username: admin   Password: Admin@2025!
        // must_change_password = TRUE → forced reset on first login
        User::firstOrCreate(
            ['username' => 'admin'],
            [
                'first_name'           => 'System',
                'last_name'            => 'Administrator',
                'email'                => 'admin@ocpgroup.ma',
                'email_domain_id'      => $ocp->id,
                'password'             => 'Admin@2025!', // auto-hashed by 'hashed' cast
                'role'                 => User::ROLE_ADMIN,
                'is_active'            => true,
                'must_change_password' => true,
            ]
        );
    }
}
