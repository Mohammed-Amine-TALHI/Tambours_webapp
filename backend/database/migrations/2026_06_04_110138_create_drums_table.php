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
        Schema::create('drums', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conveyor_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('numero');          // N° within the conveyor
            $table->string('diametre')->nullable();     // Ø
            $table->string('longueur')->nullable();     // L
            $table->string('etat')->nullable();         // Tambour state (col V)
            $table->string('liaison_dynano')->nullable();
            $table->string('liaison_anano')->nullable();
            $table->string('liaison_etat')->nullable();
            $table->json('circle')->nullable();         // {x,y,r} normalized on conveyor image
            $table->timestamps();

            $table->unique(['conveyor_id', 'numero']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('drums');
    }
};
