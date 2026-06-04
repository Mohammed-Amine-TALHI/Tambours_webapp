<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1) email_domains — list of allowed email domains for user creation
        Schema::create('email_domains', function (Blueprint $table) {
            $table->id();
            $table->string('domain', 180)->unique();
            $table->string('label', 180)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 2) users — extended for role-based auth, first-login flow, lockout
        Schema::create('users', function (Blueprint $table) {
            $table->id();

            // Identity
            $table->string('first_name', 100);
            $table->string('last_name', 100);
            $table->string('username', 120)->unique();
            $table->string('email', 220)->unique();
            $table->foreignId('email_domain_id')->constrained('email_domains');

            // Auth
            $table->string('password');                       // bcrypt hash
            $table->boolean('must_change_password')->default(true);
            $table->timestamp('password_changed_at')->nullable();

            // Authorization
            $table->enum('role', ['admin', 'operateur'])->default('operateur')->index();
            $table->boolean('is_active')->default(true)->index();

            // Audit + lockout
            $table->timestamp('last_login_at')->nullable();
            $table->string('last_login_ip', 45)->nullable();
            $table->unsignedInteger('failed_login_count')->default(0);
            $table->timestamp('locked_until')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();

            $table->rememberToken();
            $table->timestamps();
        });

        // 3) password_reset_tokens — kept for Laravel compatibility (not used directly here)
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        // 4) sessions — used by SESSION_DRIVER=database
        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
        Schema::dropIfExists('email_domains');
    }
};
