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
        Schema::create('conveyors', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();           // B0..B7, T1..T17, RP, stacker...
            $table->string('name')->nullable();         // human label
            $table->string('family')->nullable();       // B / T / RP for grouping
            $table->string('inst_label')->nullable();   // original Excel "Inst" text
            $table->json('characteristics')->nullable(); // bande, entraxe, hauteur, vitesse...
            $table->string('image_path')->nullable();   // conveyor schematic (from Excel)
            $table->unsignedInteger('image_width')->nullable();
            $table->unsignedInteger('image_height')->nullable();
            $table->json('master_zone')->nullable();    // clickable zone on master schema (normalized)
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('conveyors');
    }
};
