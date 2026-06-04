<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('password_reset_otps', function (Blueprint $table) {
            $table->id();
            $table->string('email', 220)->index();
            $table->string('otp_hash');                  // bcrypt of the 6-digit code
            $table->timestamp('expires_at')->index();
            $table->unsignedTinyInteger('attempts')->default(0); // wrong-attempt counter
            $table->timestamp('used_at')->nullable();    // null = still valid
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('password_reset_otps');
    }
};
