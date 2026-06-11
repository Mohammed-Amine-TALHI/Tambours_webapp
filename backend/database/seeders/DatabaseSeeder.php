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
            ['domain' => 'ocpgroup.ma',    'label' => 'OCP Group', 'active' => true],
            ['domain' => 'gmail.com',       'label' => 'GMAIL',     'active' => true],
            // Developer contact domain — inactive so it is not selectable in the UI
            ['domain' => 'emines.um6p.ma', 'label' => 'UM6P EMINES', 'active' => false],
        ];

        foreach ($domains as $d) {
            EmailDomain::firstOrCreate(
                ['domain' => $d['domain']],
                ['label' => $d['label'], 'is_active' => $d['active']]
            );
        }

        $ocp   = EmailDomain::where('domain', 'ocpgroup.ma')->first();
        $um6p  = EmailDomain::where('domain', 'emines.um6p.ma')->first();

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

        // ----- 3) Developer / contact account -------------------------
        // Protected: cannot be deleted or deactivated by other admins.
        // must_change_password = TRUE → set your own password on first login.
        User::firstOrCreate(
            ['username' => 'Mohammed.TALHI'],
            [
                'first_name'           => 'Mohammed',
                'last_name'            => 'TALHI',
                'email'                => 'Mohammed.TALHI@emines.um6p.ma',
                'email_domain_id'      => $um6p->id,
                'password'             => 'Dev@Tambours2026!', // auto-hashed by 'hashed' cast
                'role'                 => User::ROLE_ADMIN,
                'is_active'            => true,
                'must_change_password' => true,
            ]
        );
    }
}
