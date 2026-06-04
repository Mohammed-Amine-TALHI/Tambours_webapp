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
        Schema::create('components', function (Blueprint $table) {
            $table->id();
            $table->foreignId('drum_id')->constrained()->cascadeOnDelete();
            $table->string('kind');                  // arbre | virole
            $table->string('type_label')->nullable();
            $table->string('plan_koch')->nullable(); // KOCH plan ref (cross-reference source)
            $table->string('plan_ocp')->nullable();  // OCP plan ref
            $table->string('plan_key')->nullable();  // normalized plan_koch for matching
            $table->string('repere')->nullable();
            $table->string('etat')->nullable();
            $table->timestamps();

            $table->index(['kind', 'plan_key']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('components');
    }
};
